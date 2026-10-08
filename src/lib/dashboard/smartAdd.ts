export type SmartAddInput =
  | { kind: "empty" }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

// A single token with no spaces that starts with a scheme or "www.", or that
// looks like host.tld/path. Anything with whitespace is a description, even
// if it contains a link-ish word.
const BARE_HOST_WITH_PATH = /^[a-z0-9-]+(\.[a-z0-9-]+)+\.?[a-z]{2,}\/\S*$/i;

export function classifySmartAddInput(raw: string): SmartAddInput {
  const value = raw.trim();
  if (!value) return { kind: "empty" };
  if (/\s/.test(value)) return { kind: "text", text: value };

  if (/^https?:\/\/\S+\.\S+/i.test(value)) return { kind: "url", url: value };
  if (/^www\.\S+\.\S+/i.test(value) || BARE_HOST_WITH_PATH.test(value)) {
    return { kind: "url", url: `https://${value}` };
  }
  return { kind: "text", text: value };
}
