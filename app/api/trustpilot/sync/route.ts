import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { createAdminClient } from "@/lib/supabase";

const TRUSTPILOT_URL = "https://es.trustpilot.com/review/revolutia.ai";
const SYNC_SECRET = process.env.SYNC_SECRET ?? "sync-secret-revolutia";

function fetchHtml(url: string): string {
  return execSync(
    `curl -s -L --max-time 20 \
      -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
      -H "Accept-Language: es-ES,es;q=0.9" \
      "${url}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
}

function parseReviews(html: string) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];
  let data: Record<string, unknown>;
  try { data = JSON.parse(match[1]); } catch { return []; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawReviews = (data as any)?.props?.pageProps?.reviews;
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
    const total = data?.props?.pageProps?.businessUnit?.numberOfReviews?.total ?? 130;
    return Math.ceil(total / 20);
  } catch { return 7; }
}

export async function POST(req: NextRequest) {
  // Validate secret to prevent unauthorized calls
  const auth = req.headers.get("x-sync-secret") ?? req.nextUrl.searchParams.get("secret");
  if (auth !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  const allReviews: ReturnType<typeof parseReviews> = [];

  try {
    // Page 1 — also gets total pages
    const firstHtml = fetchHtml(TRUSTPILOT_URL);
    const totalPages = getTotalPages(firstHtml);
    const page1 = parseReviews(firstHtml);
    allReviews.push(...page1);

    // Remaining pages
    for (let page = 2; page <= totalPages; page++) {
      await new Promise((r) => setTimeout(r, 800));
      const html = fetchHtml(`${TRUSTPILOT_URL}?page=${page}`);
      const reviews = parseReviews(html);
      if (reviews.length === 0) break;
      allReviews.push(...reviews);
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Scraping failed", detail: String(err) },
      { status: 500 }
    );
  }

  if (allReviews.length === 0) {
    return NextResponse.json({ error: "No reviews scraped — Trustpilot may have blocked" }, { status: 502 });
  }

  // Upsert in batches of 50
  const BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < allReviews.length; i += BATCH) {
    const batch = allReviews.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (supabase.from("trustpilot_reviews" as any) as any)
      .upsert(batch, { onConflict: "trustpilot_id", count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    upserted += count ?? batch.length;
  }

  // Total in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalInDb } = await (supabase.from("trustpilot_reviews" as any) as any)
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    scraped: allReviews.length,
    upserted,
    totalInDb,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
}
