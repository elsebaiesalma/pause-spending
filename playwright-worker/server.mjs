import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT ?? 8080);
const AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN;
const NAV_TIMEOUT_MS = 20_000;
const SETTLE_TIMEOUT_MS = 2_000;

// A realistic desktop Chrome UA/viewport - some retailers (the spec's own
// Aritzia example) serve a bot-detection challenge or an empty shell to
// requests that look like a script rather than a browser.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const VIEWPORT = { width: 1440, height: 900 };

if (!AUTH_TOKEN) {
  throw new Error("WORKER_AUTH_TOKEN is not set");
}

let browserPromise;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

async function renderUrl(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: VIEWPORT,
    locale: "en-US",
  });

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    // Best-effort settle for pages that inject product JSON-LD/OG tags via
    // client-side JS after the initial DOM is ready. Not every page ever
    // reaches true network-idle (background polling, analytics beacons),
    // so a short bounded wait - not networkidle - is what actually finishes.
    await page.waitForTimeout(SETTLE_TIMEOUT_MS);
    return await page.content();
  } finally {
    await context.close();
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function isAuthorized(req) {
  const header = req.headers.authorization ?? "";
  return header === `Bearer ${AUTH_TOKEN}`;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method !== "POST" || req.url !== "/render") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!isAuthorized(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_request", message: error.message }));
    return;
  }

  if (!isHttpUrl(body.url)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_url" }));
    return;
  }

  try {
    const html = await renderUrl(body.url);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ html }));
  } catch (error) {
    console.error(`Render failed for ${body.url}:`, error.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "render_failed", message: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Browser worker listening on :${PORT}`);
});

async function shutdown() {
  server.close();
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
