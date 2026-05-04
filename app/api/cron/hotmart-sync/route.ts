/**
 * Cron diario: pull de Hotmart Sales API → upsert a hotmart_raw_sales → refresh vista materializada.
 *
 * Schedule: 03:00 UTC todos los días (vercel.json).
 * Estrategia: ventana móvil últimos 90 días en chunks de 60 días.
 * Idempotente: upsert por `transaction` (PK).
 *
 * Env vars necesarias:
 *   HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, HOTMART_BASIC_AUTH
 *   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *   CRON_SECRET (opcional, para validar header)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const maxDuration = 300; // hasta 5 minutos
export const runtime = "nodejs";

const HOTMART_AUTH_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";
const HOTMART_API = "https://developers.hotmart.com";
const STATUSES = [null, "REFUNDED", "CANCELLED", "CHARGEBACK", "OVERDUE", "EXPIRED", "WAITING_PAYMENT"];
const CHUNK_DAYS = 60;
const PULL_DAYS = 90;

type HotmartItem = {
  buyer?: { email?: string; name?: string; ucode?: string };
  product?: { id?: number; name?: string };
  purchase?: {
    transaction?: string;
    status?: string;
    is_subscription?: boolean;
    approved_date?: number;
    order_date?: number;
    warranty_expire_date?: number;
    offer?: { code?: string; payment_mode?: string };
    payment?: { method?: string; type?: string; installments_number?: number };
    price?: { value?: number; currency_code?: string };
    hotmart_fee?: { total?: number };
  };
};

async function getToken(): Promise<string> {
  const clientId = process.env.HOTMART_CLIENT_ID!;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET!;
  const basic = process.env.HOTMART_BASIC_AUTH!;
  const url = `${HOTMART_AUTH_URL}?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;
  const r = await fetch(url, { method: "POST", headers: { Authorization: basic } });
  const j = await r.json();
  if (!j.access_token) throw new Error("Hotmart auth failed: " + JSON.stringify(j));
  return j.access_token;
}

async function pullChunk(token: string, start: number, end: number, status: string | null): Promise<HotmartItem[]> {
  let pageToken: string | null = null;
  const items: HotmartItem[] = [];
  do {
    const params = new URLSearchParams({
      start_date: String(start),
      end_date: String(end),
      max_results: "500",
    });
    if (status) params.set("transaction_status", status);
    if (pageToken) params.set("page_token", pageToken);
    const url = `${HOTMART_API}/payments/api/v1/sales/history?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // Some statuses fail with 400 when no data; log y skip
      if (res.status === 400) return items;
      throw new Error(`Hotmart API ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    items.push(...((json.items as HotmartItem[]) ?? []));
    pageToken = (json.page_info?.next_page_token as string | null) ?? null;
  } while (pageToken);
  return items;
}

function toIso(ts: number | undefined): string | null {
  return ts ? new Date(ts).toISOString() : null;
}

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron añade header `Authorization: Bearer <CRON_SECRET>` si está configurado
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const out: { status: string; chunks: number; total_items: number; new_or_updated: number; errors: string[]; duration_ms: number; refresh_ok?: boolean } = {
    status: "running",
    chunks: 0,
    total_items: 0,
    new_or_updated: 0,
    errors: [],
    duration_ms: 0,
  };

  try {
    let token = await getToken();
    const supabase = createAdminClient();

    const endGlobal = Date.now();
    const startGlobal = endGlobal - PULL_DAYS * 24 * 60 * 60 * 1000;
    const chunkMs = CHUNK_DAYS * 24 * 60 * 60 * 1000;

    const seen = new Set<string>();
    const allItems: HotmartItem[] = [];

    let cursor = startGlobal;
    while (cursor < endGlobal) {
      const next = Math.min(cursor + chunkMs, endGlobal);
      for (const status of STATUSES) {
        try {
          const items = await pullChunk(token, cursor, next, status);
          for (const it of items) {
            const tx = it.purchase?.transaction;
            if (tx && !seen.has(tx)) {
              seen.add(tx);
              allItems.push(it);
            }
          }
        } catch (e) {
          // Si el token expiró (~30min), renovar y reintentar
          const msg = String(e);
          if (msg.includes("401") || msg.includes("403")) {
            token = await getToken();
            const items = await pullChunk(token, cursor, next, status);
            for (const it of items) {
              const tx = it.purchase?.transaction;
              if (tx && !seen.has(tx)) {
                seen.add(tx);
                allItems.push(it);
              }
            }
          } else {
            out.errors.push(`chunk ${new Date(cursor).toISOString().slice(0, 10)} status=${status}: ${msg}`);
          }
        }
      }
      out.chunks++;
      cursor = next + 1;
    }

    out.total_items = allItems.length;

    // Upsert en lotes de 500
    const rows = allItems
      .map((s) => ({
        transaction: s.purchase?.transaction,
        buyer_email: s.buyer?.email ?? "",
        buyer_name: s.buyer?.name ?? null,
        buyer_ucode: s.buyer?.ucode ?? "",
        product_id: s.product?.id ?? null,
        product_name: s.product?.name ?? null,
        offer_code: s.purchase?.offer?.code ?? null,
        payment_mode: s.purchase?.offer?.payment_mode ?? null,
        installments_total: s.purchase?.payment?.installments_number ?? 1,
        payment_method: s.purchase?.payment?.method ?? null,
        payment_type: s.purchase?.payment?.type ?? null,
        is_subscription: s.purchase?.is_subscription ?? false,
        status: s.purchase?.status ?? "UNKNOWN",
        price_value: s.purchase?.price?.value ?? null,
        price_currency: s.purchase?.price?.currency_code ?? null,
        hotmart_fee_total: s.purchase?.hotmart_fee?.total ?? null,
        approved_date: toIso(s.purchase?.approved_date),
        order_date: toIso(s.purchase?.order_date),
        warranty_expire: toIso(s.purchase?.warranty_expire_date),
        raw_payload: s,
        synced_at: new Date().toISOString(),
      }))
      .filter((r) => r.transaction && r.buyer_email && r.buyer_ucode);

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("hotmart_raw_sales" as any) as any).upsert(batch, {
        onConflict: "transaction",
        ignoreDuplicates: false,
      });
      if (error) {
        out.errors.push(`upsert chunk ${i}-${i + batch.length}: ${error.message}`);
      } else {
        out.new_or_updated += batch.length;
      }
    }

    // Refresh vista materializada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: refreshErr } = await (supabase.rpc as any)("refresh_client_orders_metrics");
    out.refresh_ok = !refreshErr;
    if (refreshErr) out.errors.push(`refresh view: ${refreshErr.message}`);

    out.status = out.errors.length > 0 ? "completed_with_errors" : "ok";
  } catch (e) {
    out.status = "fatal";
    out.errors.push(String(e));
  }

  out.duration_ms = Date.now() - startedAt;
  return NextResponse.json(out);
}
