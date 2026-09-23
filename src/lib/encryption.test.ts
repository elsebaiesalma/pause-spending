import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./encryption";

describe("encrypt/decrypt", () => {
  it("round-trips plaintext through an AES-256-GCM envelope", () => {
    const plaintext = JSON.stringify({ accessToken: "secret-value", refreshToken: "also-secret" });

    const envelope = encrypt(plaintext);

    expect(envelope.ciphertext).not.toContain("secret-value");
    expect(decrypt(envelope)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "same input";

    const first = encrypt(plaintext);
    const second = encrypt(plaintext);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it("fails to decrypt if the ciphertext has been tampered with", () => {
    const envelope = encrypt("sensitive");
    const tampered = { ...envelope, ciphertext: Buffer.from("tampered").toString("base64") };

    expect(() => decrypt(tampered)).toThrow();
  });
});
