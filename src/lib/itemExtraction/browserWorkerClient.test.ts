import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchViaBrowserWorker } from "./browserWorkerClient";

const ORIGINAL_ENV = { ...process.env };

describe("fetchViaBrowserWorker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null without calling fetch when the worker isn't configured", async () => {
    delete process.env.BROWSER_WORKER_URL;
    delete process.env.BROWSER_WORKER_AUTH_TOKEN;
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await fetchViaBrowserWorker("https://retailer.com/product");

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the url with bearer auth and returns the rendered html on success", async () => {
    process.env.BROWSER_WORKER_URL = "https://worker.example.com";
    process.env.BROWSER_WORKER_AUTH_TOKEN = "secret-token";
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ html: "<html>rendered</html>" }), { status: 200 }));

    const result = await fetchViaBrowserWorker("https://retailer.com/product");

    expect(result).toBe("<html>rendered</html>");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://worker.example.com/render",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
        body: JSON.stringify({ url: "https://retailer.com/product" }),
      })
    );
  });

  it("returns null on a non-ok response rather than throwing", async () => {
    process.env.BROWSER_WORKER_URL = "https://worker.example.com";
    process.env.BROWSER_WORKER_AUTH_TOKEN = "secret-token";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 502 }));

    const result = await fetchViaBrowserWorker("https://retailer.com/product");

    expect(result).toBeNull();
  });

  it("returns null when fetch itself throws, rather than propagating", async () => {
    process.env.BROWSER_WORKER_URL = "https://worker.example.com";
    process.env.BROWSER_WORKER_AUTH_TOKEN = "secret-token";
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));

    const result = await fetchViaBrowserWorker("https://retailer.com/product");

    expect(result).toBeNull();
  });
});
