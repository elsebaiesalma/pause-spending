import { describe, expect, it } from "vitest";
import { classifyEmailTypeByRules } from "./emailTypeRules";

describe("classifyEmailTypeByRules", () => {
  it.each([
    { subject: "Your Nike Order Confirmation #12345", expected: "order_confirmation" },
    { subject: "We've received your order", expected: "order_confirmation" },
    { subject: "Thank you for your order", expected: "order_confirmation" },
    { subject: "Your digital receipt from H&M", expected: "order_confirmation" },
    { subject: "Order #5925 confirmed", expected: "order_confirmation" },
  ])("classifies $subject as order_confirmation", ({ subject, expected }) => {
    expect(classifyEmailTypeByRules({ subject })).toBe(expected);
  });

  it.each([
    { subject: "Your order #374003606 has been shipped", expected: "shipping" },
    { subject: "Your Package Has Been Shipped", expected: "shipping" },
    { subject: "UPS Update: Package Delivered", expected: "delivered" },
    { subject: "Your order has arrived", expected: "delivered" },
    { subject: "Your order is ready for pickup!", expected: "delivered" },
  ])("classifies $subject as $expected", ({ subject, expected }) => {
    expect(classifyEmailTypeByRules({ subject })).toBe(expected);
  });

  it.each([
    { subject: "Next steps for your Coach return (order #: WCP00136196)" },
    { subject: "The return of your order F0WJAH is in progress" },
  ])("classifies $subject as return", ({ subject }) => {
    expect(classifyEmailTypeByRules({ subject })).toBe("return");
  });

  it("classifies a refund subject as refund even though it also says 'return'", () => {
    expect(classifyEmailTypeByRules({ subject: "Confirmation of refund of your order F0WJAH" })).toBe(
      "refund"
    );
  });

  it.each([
    { subject: "New Arrivals just for you" },
    { subject: "Back in stock: the top you loved" },
    { subject: "25% off everything this weekend" },
  ])("classifies $subject as promo", ({ subject }) => {
    expect(classifyEmailTypeByRules({ subject })).toBe("promo");
  });

  it("classifies a subject that only implies shipping (no confirmation wording) as shipping, not ambiguous", () => {
    expect(classifyEmailTypeByRules({ subject: "A shipment from order #5925 is on the way" })).toBe(
      "shipping"
    );
  });

  it("treats a genuinely unclear subject as ambiguous rather than guessing", () => {
    expect(classifyEmailTypeByRules({ subject: "SALMA, here's an update" })).toBe("ambiguous");
  });
});
