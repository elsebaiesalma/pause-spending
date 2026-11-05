// The example receipt on the landing page. It is an illustration, labelled as
// one on the page, and the sums are computed here so the text can never
// disagree with the lines.

export type ReceiptLine = { name: string; price: number; repeat: boolean };

export const RECEIPT_LINES: readonly ReceiptLine[] = [
  { name: "White crew tee", price: 34, repeat: false },
  { name: "White linen tee", price: 29, repeat: true },
  { name: "Oversized white tee", price: 40, repeat: true },
  { name: "Black wool coat", price: 189, repeat: false },
];

const sum = (lines: readonly ReceiptLine[]) => lines.reduce((total, line) => total + line.price, 0);

export function receiptTotals() {
  const firstThree = sum(RECEIPT_LINES.slice(0, 3));
  const all = sum(RECEIPT_LINES);
  const kept = sum(RECEIPT_LINES.filter((line) => line.repeat));
  return { firstThree, all, kept, afterPause: all - kept };
}

export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// What keeps printing after the four lines above, for the hero receipt that
// never stops while nobody pauses it. A fixed cycle (no randomness), so the
// same visit always prints the same tab. `repeat` marks a piece that looks like
// something already on the tab, which is what PAUSE would have flagged.
const FEED: readonly ReceiptLine[] = [
  { name: "Ribbed tank", price: 18, repeat: false },
  { name: "White tee, again", price: 24, repeat: true },
  { name: "Linen shorts", price: 32, repeat: false },
  { name: "Mini shoulder bag", price: 45, repeat: false },
  { name: "Oversized white shirt", price: 54, repeat: true },
  { name: "Satin slip skirt", price: 41, repeat: false },
  { name: "Platform sneakers", price: 62, repeat: false },
  { name: "Another black coat", price: 120, repeat: true },
  { name: "Cropped cardigan", price: 38, repeat: false },
  { name: "Wide-leg jeans", price: 58, repeat: false },
];

// The nth line printed after the four starting ones (n = 0 is the first).
export function feedLine(n: number): ReceiptLine {
  return FEED[((n % FEED.length) + FEED.length) % FEED.length];
}

// The running tab after the four starting lines plus `extra` more.
export function runningTotals(extra: number) {
  const base = receiptTotals();
  let all = base.all;
  let kept = base.kept;
  for (let i = 0; i < extra; i += 1) {
    const line = feedLine(i);
    all += line.price;
    if (line.repeat) kept += line.price;
  }
  return { all, kept, afterPause: all - kept };
}

// The hero receipt is a fixed-size window onto the tab: this many lines are
// visible at once, and the paper never gets taller. The first window is the
// four starting lines plus the first four of the feed, so the resting example
// and the printing receipt begin identically.
export const WINDOW_LINES = 8;

// The ith line on the tab, counting the four starting lines first.
export function lineAt(i: number): ReceiptLine {
  return i < RECEIPT_LINES.length ? RECEIPT_LINES[i] : feedLine(i - RECEIPT_LINES.length);
}

// Totals for the tab as it stands once `extra` lines have scrolled in after the
// first full window.
export function tabTotals(extra: number) {
  return runningTotals(extra + (WINDOW_LINES - RECEIPT_LINES.length));
}
