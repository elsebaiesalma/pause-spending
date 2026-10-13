export type Retailer = { name: string; url: string };

// The retailer behind an item is whatever link the user gave at intake
// (pasted URL, or the URL of a search result they confirmed). Free text
// (typed items) has no link, so there is no "Go to" action for it.
export function retailerFromRawInput(rawInput: string | null): Retailer | null {
  if (!rawInput) return null;

  let url: URL;
  try {
    url = new URL(rawInput.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  return { name: url.hostname.replace(/^www\./, ""), url: url.toString() };
}
