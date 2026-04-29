/**
 * Client-side fetch cache with stale-while-revalidate pattern.
 * Returns cached data instantly on revisit while refreshing in background.
 */

type CacheEntry = {
  data: unknown;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const TTL = 300_000; // 5 minutos — sirve datos cacheados sin refetch durante 5 min, después revalida en background

/**
 * Fetch with client-side caching.
 * - First visit: fetches normally
 * - Revisit within TTL: returns cached data instantly, refreshes in background
 * - Revisit after TTL: returns cached data instantly, refreshes and updates
 */
export async function cachedFetch<T>(url: string, opts?: { skipCache?: boolean }): Promise<T> {
  const entry = cache.get(url);

  if (entry && !opts?.skipCache) {
    const age = Date.now() - entry.timestamp;

    if (age < TTL) {
      // Fresh cache — return instantly, no refresh needed
      return entry.data as T;
    }

    // Stale cache — return instantly, refresh in background
    fetch(url)
      .then((r) => r.json())
      .then((data) => cache.set(url, { data, timestamp: Date.now() }))
      .catch(() => {});

    return entry.data as T;
  }

  // No cache — fetch and store
  const res = await fetch(url);
  const data = await res.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

/**
 * Fetch with stale-while-revalidate callback pattern.
 * Calls onData immediately with cache if available, then again after fresh fetch.
 */
export function swr<T>(url: string, onData: (data: T, isStale: boolean) => void): () => void {
  let cancelled = false;
  const entry = cache.get(url);

  if (entry) {
    // Serve stale data immediately
    if (!cancelled) onData(entry.data as T, true);
  }

  // Always fetch fresh data
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      cache.set(url, { data, timestamp: Date.now() });
      if (!cancelled) onData(data as T, false);
    })
    .catch(() => {});

  return () => { cancelled = true; };
}

/**
 * Invalidate cache for a URL prefix (e.g., after a mutation)
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key);
  }
}
