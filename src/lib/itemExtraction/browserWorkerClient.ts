import { fetchWithRetry } from "@/lib/retry";

// The Playwright worker is a separate service (see /playwright-worker) -
// deliberately not run on Vercel serverless, since a real Chromium instance
// needs more time/memory than a serverless function budget allows. Calling
// it is opt-in: when it isn't configured (e.g. local dev without the worker
// running), extractFromUrl simply gets no rendered-HTML fallback and falls
// straight through to "needs manual entry", which is safe and expected.
function workerConfig(): { url: string; token: string } | null {
  const url = process.env.BROWSER_WORKER_URL;
  const token = process.env.BROWSER_WORKER_AUTH_TOKEN;
  if (!url || !token) {
    return null;
  }
  return { url: url.replace(/\/$/, ""), token };
}

// Asks the browser worker to render `url` in a real browser and return its
// HTML, for retailers that block or serve an empty shell to plain fetches.
// Returns null on any failure (unconfigured, network error, non-2xx, or the
// worker's own "couldn't render" response) rather than throwing - this is a
// fallback path, and its failure must never block the caller's own
// "needs manual entry" degradation, and must never fabricate data.
export async function fetchViaBrowserWorker(url: string): Promise<string | null> {
  const config = workerConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetchWithRetry(`${config.url}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { html?: string };
    return body.html ?? null;
  } catch {
    return null;
  }
}
