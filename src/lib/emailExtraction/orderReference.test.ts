import { describe, expect, it } from "vitest";
import { deriveOrderReferenceFromSubject } from "./orderReference";

describe("deriveOrderReferenceFromSubject", () => {
  it.each([
    { subject: "Your order #374003606 has been shipped", expected: "374003606" },
    { subject: "Order 68391089706371 has been shipped", expected: "68391089706371" },
    { subject: "Shevoke Order Update #993887", expected: "993887" },
    { subject: "Next steps for your Coach return (order #: WCP00136196)", expected: "WCP00136196" },
  ])("extracts $expected from $subject", ({ subject, expected }) => {
    expect(deriveOrderReferenceFromSubject(subject)).toBe(expected);
  });

  it("returns null when the subject states no identifiable order number", () => {
    expect(deriveOrderReferenceFromSubject("Your package is on the way")).toBeNull();
  });
});
