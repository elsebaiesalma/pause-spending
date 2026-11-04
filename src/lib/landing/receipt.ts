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
