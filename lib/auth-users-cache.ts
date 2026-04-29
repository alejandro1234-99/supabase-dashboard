/**
 * Cache server-side del mapeo email → user_id de auth.users.
 *
 * Iterar /auth/v1/admin/users es lento (~3s para 2k+ usuarios). En APIs
 * que necesitan cruzar muchos emails con profiles, mantener el mapeo en
 * memoria del proceso (TTL 2 min) baja el coste a 1 fetch por instancia
 * fría cada 2 min.
 *
 * En Vercel/serverless, el cache vive solo durante la vida de la lambda
 * (típicamente minutos a horas según uso). Una vez hidratado, requests
 * subsecuentes van directos sin coste.
 */

type Entry = { map: Record<string, string>; timestamp: number };

let cache: Entry | null = null;
const TTL = 120_000; // 2 min

export async function getEmailToUserIdMap(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.timestamp < TTL) {
    return cache.map;
  }

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

  cache = { map, timestamp: Date.now() };
  return map;
}

export function invalidateAuthUsersCache() {
  cache = null;
}
