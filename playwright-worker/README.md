# Browser worker

A standalone Playwright rendering service. `src/lib/itemExtraction/urlExtractor.ts` in the main
Next app calls it when a plain `fetch()` of a product page fails or comes back empty - the shape
of a bot-blocking retailer's response (Aritzia, Zara, Shein, and similar all serve either a
challenge page or a JS-only shell to non-browser requests).

## Why a separate service

A real Chromium process needs more memory, CPU, and wall-clock time than a serverless function
budget allows, and most serverless platforms (including Vercel, where the main Next app deploys)
either can't run Playwright's browser binaries at all or kill the function before a page finishes
rendering. This service runs as a normal long-lived container instead, on Railway, Render, or Fly.
The Next app talks to it over one authenticated HTTP endpoint and never runs Playwright itself.

## API

`GET /health` -> `200 ok`

`POST /render`
- Header: `Authorization: Bearer <WORKER_AUTH_TOKEN>`
- Body: `{ "url": "https://..." }`
- `200 { "html": "<the fully rendered page's HTML>" }`
- `401` missing/wrong token, `400` invalid body/URL, `502` navigation failed (timeout, DNS, etc.)

The worker does no parsing of its own - it only returns rendered HTML. `urlExtractor.ts` runs the
exact same JSON-LD/Open-Graph/title parser against this HTML that it runs against the plain-fetch
path's HTML, so both paths produce the identical normalised shape and there's no duplicated
extraction logic to keep in sync.

## Deploying

Any of Railway / Render / Fly work the same way: point them at this `playwright-worker/` directory
with its `Dockerfile`, set `WORKER_AUTH_TOKEN` as a secret, and deploy. Then on the Next app's side
(wherever it's deployed), set:

```
BROWSER_WORKER_URL=https://<your-worker's-deployed-url>
BROWSER_WORKER_AUTH_TOKEN=<the same WORKER_AUTH_TOKEN>
```

If those two env vars are unset, `urlExtractor.ts` simply skips the browser-worker fallback and
falls straight through to "needs manual entry" - the worker is optional infrastructure, not a hard
dependency for local development.

## Local development

```
cd playwright-worker
npm install   # also downloads the Chromium binary via the postinstall hook
WORKER_AUTH_TOKEN=dev-token npm run dev
```

Then point the Next app's `.env` at it: `BROWSER_WORKER_URL=http://localhost:8080`,
`BROWSER_WORKER_AUTH_TOKEN=dev-token`.
