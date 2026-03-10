/**
 * Script de importación de reviews de Trustpilot
 * Uso: npm run import:trustpilot
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TRUSTPILOT_URL = "https://es.trustpilot.com/review/revolutia.ai";

type Review = {
  reviewer_name: string;
  stars: number;
  review_date: string;
  headline: string;
  review_body: string;
  trustpilot_id: string;
};

function fetchHtml(url: string): string {
  return execSync(
    `curl -s -L --max-time 20 \
      -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
      -H "Accept-Language: es-ES,es;q=0.9" \
      "${url}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
}

function parseReviewsFromHtml(html: string): Review[] {
  // Las reviews están en __NEXT_DATA__ como JSON
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageProps = (data as any)?.props?.pageProps;
  const rawReviews = pageProps?.reviews;
  if (!Array.isArray(rawReviews)) return [];

  return rawReviews.map((r: {
    id: string;
    consumer: { displayName: string };
    rating: number;
    dates: { publishedDate: string };
    title: string;
    text: string;
  }) => ({
    trustpilot_id: r.id,
    reviewer_name: r.consumer?.displayName ?? "Anónimo",
    stars: r.rating,
    review_date: r.dates?.publishedDate ?? new Date().toISOString(),
    headline: r.title ?? "",
    review_body: r.text ?? "",
  })).filter((r) => r.stars >= 1 && r.stars <= 5);
}

function getTotalPages(html: string): number {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return 7;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(match[1]);
    const total = data?.props?.pageProps?.businessUnit?.numberOfReviews?.total
      ?? data?.props?.pageProps?.pagination?.totalReviews
      ?? 130;
    return Math.ceil(total / 20);
  } catch {
    return 7;
  }
}

async function main() {
  console.log("🌟 Importando reviews de Trustpilot → Supabase\n");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan credenciales de Supabase en .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Obtener primera página para saber total
  console.log("📥 Obteniendo página 1...");
  const firstHtml = fetchHtml(TRUSTPILOT_URL);
  const totalPages = getTotalPages(firstHtml);
  console.log(`📊 ~${totalPages} páginas (~${totalPages * 20} reviews)\n`);

  const allReviews: Review[] = [];
  const page1Reviews = parseReviewsFromHtml(firstHtml);
  allReviews.push(...page1Reviews);
  console.log(`  Página 1/${totalPages}... ${page1Reviews.length} reviews`);

  for (let page = 2; page <= totalPages; page++) {
    await new Promise((r) => setTimeout(r, 1000));
    const html = fetchHtml(`${TRUSTPILOT_URL}?page=${page}`);
    const reviews = parseReviewsFromHtml(html);
    allReviews.push(...reviews);
    console.log(`  Página ${page}/${totalPages}... ${reviews.length} reviews`);
    if (reviews.length === 0) break; // sin más páginas
  }

  if (allReviews.length === 0) {
    console.log("\n⚠️  No se encontraron reviews.");
    process.exit(0);
  }

  console.log(`\n✅ Total obtenidas: ${allReviews.length} reviews`);
  console.log("📤 Insertando en Supabase...");

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < allReviews.length; i += BATCH) {
    const batch = allReviews.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (supabase.from("trustpilot_reviews" as any) as any)
      .upsert(batch, { onConflict: "trustpilot_id", count: "exact" });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      break;
    }
    inserted += count ?? batch.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: total } = await (supabase.from("trustpilot_reviews" as any) as any)
    .select("*", { count: "exact", head: true });

  const avg = (allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length).toFixed(2);
  console.log(`\n🎉 Hecho:`);
  console.log(`   ${total ?? inserted} reviews en Supabase`);
  console.log(`   ⭐ Media: ${avg}/5`);
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
