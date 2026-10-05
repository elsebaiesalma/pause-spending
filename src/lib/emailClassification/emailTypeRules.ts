// What a specific email actually is, distinct from whether it's fashion/
// clothing-relevant at all (that's classifyEmail's job, upstream of this).
// Only "order_confirmation" is allowed to create a Purchase - every other
// type restates or follows up on an order that a confirmation email should
// already have captured, and re-extracting from it just produces
// duplicate/inconsistent rows (e.g. a shipping notice showing a marketing
// sale price that was never actually charged).
export type EmailType =
  | "order_confirmation"
  | "shipping"
  | "delivered"
  | "return"
  | "refund"
  | "promo"
  | "other";

export type ClassifiableTypeEmail = {
  subject: string;
  snippet?: string;
};

// Ordered so a more specific/definitive signal wins over a broader one
// (e.g. "refund" before "return", since a refund email's subject often
// also contains "return").
const REFUND_PATTERNS = [/\brefund/i];
const RETURN_PATTERNS = [/\breturn\b/i, /\bexchange\b/i];
const DELIVERED_PATTERNS = [/\bdelivered\b/i, /\barrived\b/i, /out for delivery/i, /ready for pickup/i];
const SHIPPING_PATTERNS = [
  /\bshipped\b/i,
  /\bshipment\b/i,
  /on (?:its|the) way/i,
  /tracking/i,
  /\bpackage\b/i,
];
const CONFIRMATION_PATTERNS = [
  /order confirmation/i,
  /order (?:has been )?(?:received|processed|confirmed)/i,
  /we.?ve received your order/i,
  /thank you for your order/i,
  /your (?:digital )?receipt/i,
  /order #?\w+ confirmed/i,
];
const PROMO_PATTERNS = [
  /%\s*off/i,
  /\bsale\b/i,
  /new arrivals/i,
  /just for you/i,
  /recommended for you/i,
  /back in stock/i,
  /free shipping today/i,
  /shop now/i,
  /you.?ll love/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

// Confidently classifies the common case by subject line alone (checked in
// priority order: refund/return/delivered/shipping are all distinctive
// enough to trust over a generic-sounding "confirmation"-like subject).
// Anything not confidently matched is "ambiguous" and must go through the
// LLM fallback rather than being guessed here.
export function classifyEmailTypeByRules(email: ClassifiableTypeEmail): EmailType | "ambiguous" {
  const text = email.subject;

  if (matchesAny(text, REFUND_PATTERNS)) return "refund";
  if (matchesAny(text, RETURN_PATTERNS)) return "return";
  if (matchesAny(text, DELIVERED_PATTERNS)) return "delivered";
  if (matchesAny(text, SHIPPING_PATTERNS)) return "shipping";
  if (matchesAny(text, PROMO_PATTERNS)) return "promo";
  if (matchesAny(text, CONFIRMATION_PATTERNS)) return "order_confirmation";

  return "ambiguous";
}
