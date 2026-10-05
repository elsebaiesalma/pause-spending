// In-memory TTL cache for search results, keyed by normalized query string.
// Deliberately process-local, not a shared store (no Redis/KV in this
// stack) - fine for this app's low-traffic, single-user scale, but a
// serverless deployment with per-invocation cold starts would see a lower
// effective hit rate than a long-lived process would, since the cache
// resets on every cold start.
const TTL_MS = 15 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;

export function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  const hit = Boolean(entry && entry.expiresAt >= Date.now());
  if (entry && !hit) store.delete(key);
  if (hit) hits += 1;
  else misses += 1;
  logHitRate();
  return hit ? (entry!.value as T) : undefined;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

function logHitRate(): void {
  const total = hits + misses;
  // Every 10th lookup, not every one, so this doesn't spam logs under real traffic.
  if (total % 10 === 0) {
    console.log(`[searchCache] hit rate: ${((hits / total) * 100).toFixed(1)}% (${hits}/${total} lookups)`);
  }
}

// Test-only: reset in-process cache/counters between test files.
export function _resetSearchCacheForTests(): void {
  store.clear();
  hits = 0;
  misses = 0;
}
