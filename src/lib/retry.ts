function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Full jitter (AWS's recommended strategy): a random value between 0 and
// the exponential cap, rather than the cap plus/minus jitter - this spreads
// out retries from many concurrent callers instead of having them all wake
// up at the same handful of instants.
function backoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.random() * cap;
}

function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(header);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export type FetchWithRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

// Wraps fetch with exponential backoff + full jitter. Retries only network
// errors (fetch throwing) and 429/5xx responses - a 4xx response other than
// 429 is a client error that retrying can never fix, so it's returned as-is
// on the first attempt. When the server sends `Retry-After`, that value is
// honored instead of the computed backoff delay. Attempts are capped; once
// exhausted, the last network error is thrown or the last (still-failing)
// Response is returned, so callers keep their existing "non-ok response" /
// "caught exception" handling as the degraded path - this never introduces
// a new failure mode, it just gives transient failures a chance to clear
// first.
export async function fetchWithRetry(
  input: string | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { maxAttempts = 4, baseDelayMs = 250, maxDelayMs = 4000 } = options;

  for (let attempt = 0; ; attempt++) {
    const isLastAttempt = attempt === maxAttempts - 1;

    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      if (isLastAttempt) throw error;
      await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs));
      continue;
    }

    if (isLastAttempt || !isRetryableStatus(response.status)) {
      return response;
    }

    const delay = retryAfterMs(response.headers.get("retry-after")) ?? backoffDelayMs(attempt, baseDelayMs, maxDelayMs);
    await sleep(delay);
  }
}
