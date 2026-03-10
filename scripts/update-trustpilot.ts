/**
 * Script de ACTUALIZACIÓN de reviews de Trustpilot
 *
 * Solo comprueba las últimas páginas para añadir reviews nuevas.
 * Ideal para ejecutar periódicamente (ej: diariamente).
 *
 * Uso:
 *   npm run update:trustpilot
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TRUSTPILOT_URL = "https://es.trustpilot.com/review/revolutia.ai";
const PAGES_TO_CHECK = 2; // Comprueba las 2 últimas páginas (40 reviews más recientes)

async function fetchPage(page: number) {
  const url = page === 1 ? TRUSTPILOT_URL : `${TRUSTPILOT_URL}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const reviews = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const list = item["@type"] === "Review" ? [item] : (item.review ?? []);
        for (const r of list) {
          if (r["@type"] !== "Review") continue;
          const stars = parseInt(r.reviewRating?.ratingValue ?? "0");
          if (!stars) continue;
          const name = r.author?.name ?? "Anónimo";
          const body = r.reviewBody ?? "";
          const trustpilot_id = Buffer.from(`${name}|${r.datePublished}|${body.slice(0, 50)}`).toString("base64").slice(0, 64);
          reviews.push({
            reviewer_name: name,
            stars,
            review_date: r.datePublished ?? new Date().toISOString(),
            headline: r.headline ?? "",
            review_body: body,
            trustpilot_id,
          });
        }
      }
    } catch { /* ignorar */ }
  }
  return reviews;
}

async function main() {
  console.log(`🔄 Actualizando reviews de Trustpilot (últimas ${PAGES_TO_CHECK} páginas)...\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const allReviews = [];
  for (let p = 1; p <= PAGES_TO_CHECK; p++) {
    const reviews = await fetchPage(p);
    allReviews.push(...reviews);
    if (p < PAGES_TO_CHECK) await new Promise((r) => setTimeout(r, 1000));
  }

  if (allReviews.length === 0) {
    console.log("⚠️  Sin reviews obtenidas.");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase.from("trustpilot_reviews" as any) as any)
    .upsert(allReviews, { onConflict: "trustpilot_id", count: "exact" });

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return;
  }

  console.log(`✅ ${count ?? allReviews.length} reviews procesadas (nuevas insertadas, existentes actualizadas)`);
}

main().catch(console.error);
