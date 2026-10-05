import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, isRetryableStatus } from "./retry";

function jsonResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("isRetryableStatus", () => {
  it("treats 429 and any 5xx as retryable, everything else as not", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(200)).toBe(false);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the response immediately on success, with no retries", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200));

    const response = await fetchWithRetry("https://example.com");

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns a non-retryable 4xx response immediately, without retrying", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(404));

    const response = await fetchWithRetry("https://example.com");

    expect(response.status).toBe(404);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 with backoff and eventually returns a successful response", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(429))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry("https://example.com", undefined, { maxAttempts: 4 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx the same way as a 429", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry("https://example.com", undefined, { maxAttempts: 4 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After (seconds) instead of the computed backoff delay", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(429, { "retry-after": "30" }))
      .mockResolvedValueOnce(jsonResponse(200));
    const sleepSpy = vi.spyOn(global, "setTimeout");

    const promise = fetchWithRetry("https://example.com", undefined, { maxAttempts: 4 });
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
  });

  it("retries a network error (fetch throwing) and succeeds once it clears", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(jsonResponse(200));

    const promise = fetchWithRetry("https://example.com", undefined, { maxAttempts: 4 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("stops after maxAttempts and returns the last (still-failing) response", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(503));

    const promise = fetchWithRetry("https://example.com", undefined, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 10,
    });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(503);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("stops after maxAttempts and throws the last network error", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const promise = fetchWithRetry("https://example.com", undefined, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 10,
    });
    const assertion = expect(promise).rejects.toThrow("ECONNRESET");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
