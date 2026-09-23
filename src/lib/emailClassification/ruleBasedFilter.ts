export type ClassificationResult = "in_scope" | "out_of_scope" | "ambiguous";

export type ClassifiableEmail = {
  from: string;
  subject: string;
};

// Domains confidently known to sell only (or primarily) clothing, shoes, or
// accessories - an order confirmation from one of these is in-scope without
// needing an LLM call.
const FASHION_RETAILER_DOMAINS = [
  "nike.com",
  "zara.com",
  "asos.com",
  "nordstrom.com",
  "uniqlo.com",
  "hm.com",
  "everlane.com",
  "gap.com",
  "oldnavy.com",
  "jcrew.com",
  "lululemon.com",
  "abercrombie.com",
  "footlocker.com",
  "aritzia.com",
  "madewell.com",
];

// Domains confidently known to never sell clothing/shoes/accessories - an
// order confirmation (or receipt/bill) from one of these is out-of-scope
// without needing an LLM call.
const NON_FASHION_DOMAINS = [
  "netflix.com",
  "spotify.com",
  "instacart.com",
  "wholefoodsmarket.com",
  "doordash.com",
  "ubereats.com",
  "bestbuy.com",
  "verizon.com",
  "comcast.com",
  "coned.com",
];

function extractSenderDomain(fromHeader: string): string {
  const match = fromHeader.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : "";
}

// Reduces a domain like "email.orders.nike.com" to its registrable root
// "nike.com" so subdomain variations still match the allow/deny lists.
function rootDomain(domain: string): string {
  const parts = domain.split(".");
  return parts.slice(-2).join(".");
}

function matchesAnyDomain(domain: string, list: string[]): boolean {
  const root = rootDomain(domain);
  return list.some((known) => root === known);
}

// Confidently classifies the common case by sender domain alone. Anything
// not on either list is "ambiguous" and must go through the LLM fallback
// (implemented in a later step) rather than being guessed here.
export function classifyEmailByRules(email: ClassifiableEmail): ClassificationResult {
  const domain = extractSenderDomain(email.from);
  if (!domain) {
    return "ambiguous";
  }

  if (matchesAnyDomain(domain, FASHION_RETAILER_DOMAINS)) {
    return "in_scope";
  }

  if (matchesAnyDomain(domain, NON_FASHION_DOMAINS)) {
    return "out_of_scope";
  }

  return "ambiguous";
}
