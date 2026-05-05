/**
 * Cache del mapeo email -> user_id de auth.users.
 *
 * Estrategia en cascada:
 *   1. Cache en memoria del proceso (TTL 2 min).
 *   2. Tabla `cached_auth_emails` en Postgres (refresh cada 24h).
 *   3. Fallback: paginar /auth/v1/admin/users (~3s) y rellenar ambos caches.
 *
 * En frío (proceso recién arrancado) la primera consulta a la tabla tarda
 * <100ms en lugar de los ~3s del fallback.
 */

import { createAdminClient } from "./supabase";

type Entry = { map: Record<string, string>; timestamp: number };

let cache: Entry | null = null;
const TTL = 120_000; // 2 min
const TABLE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — se refresca via cron

async function fetchFromAdminApi(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  };
  for (let page = 1; page <= 100; page++) {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers, cache: "no-store" }
    );
    if (!r.ok) break;
    const d = await r.json();
    const us = (d.users ?? []) as { id: string; email?: string }[];
    if (!us.length) break;
    for (const u of us) {
      if (u.email) map[u.email.toLowerCase()] = u.id;
    }
  }
  return map;
}

async function fetchFromTable(): Promise<Record<string, string> | null> {
  try {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("cached_auth_emails" as any) as any)
      .select("user_id, email, refreshed_at")
      .limit(50000);
    if (error || !data || data.length === 0) return null;

    // Si la fila más antigua tiene >24h, fuerza refresh en background.
    const oldest = (data as { refreshed_at: string }[])
      .reduce((m, r) => Math.min(m, new Date(r.refreshed_at).getTime()), Date.now());
    if (Date.now() - oldest > TABLE_TTL_MS) {
      void refreshTable().catch(() => {});
    }

    const map: Record<string, string> = {};
    for (const r of data as { user_id: string; email: string }[]) {
      if (r.email) map[r.email.toLowerCase()] = r.user_id;
    }
    return map;
  } catch {
    return null;
  }
}

async function writeToTable(map: Record<string, string>): Promise<void> {
  try {
    const supabase = createAdminClient();
    const rows = Object.entries(map).map(([email, user_id]) => ({
      user_id, email, refreshed_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;
    // Upsert en chunks por límites de payload.
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("cached_auth_emails" as any) as any)
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id" });
    }
  } catch {
    // si falla, simplemente no se cachea — la próxima request reintenta
  }
}

export async function refreshTable(): Promise<number> {
  const map = await fetchFromAdminApi();
  await writeToTable(map);
  cache = { map, timestamp: Date.now() };
  return Object.keys(map).length;
}

export async function getEmailToUserIdMap(): Promise<Record<string, string>> {
  // 1) Cache de memoria
  if (cache && Date.now() - cache.timestamp < TTL) return cache.map;

  // 2) Tabla en Postgres
  const fromTable = await fetchFromTable();
  if (fromTable) {
    cache = { map: fromTable, timestamp: Date.now() };
    return fromTable;
  }

  // 3) Fallback: admin API + rellenar tabla y memoria
  const map = await fetchFromAdminApi();
  cache = { map, timestamp: Date.now() };
  // Escribir a la tabla en background — no bloquea la respuesta.
  void writeToTable(map).catch(() => {});
  return map;
}

export function invalidateAuthUsersCache() {
  cache = null;
}

// Pre-warm: dispara la carga inicial al importar el módulo. Si la tabla
// está poblada cuesta ~50ms; si no, paga el fallback (~3s) pero queda
// rellena para el resto de requests.
if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  void getEmailToUserIdMap().catch(() => {});
}
