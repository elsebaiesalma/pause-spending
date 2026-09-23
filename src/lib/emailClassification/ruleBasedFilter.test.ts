import { describe, expect, it } from "vitest";
import { classifyEmailByRules } from "./ruleBasedFilter";

describe("classifyEmailByRules", () => {
  it.each([
    { from: "orders@nike.com", subject: "Your Nike Order Confirmation #12345" },
    { from: "noreply@zara.com", subject: "Order Confirmation - Zara" },
    { from: "notify@asos.com", subject: "Your ASOS order has been confirmed" },
    {
      from: "noreply@email.nordstrom.com",
      subject: "Thank you for your Nordstrom purchase",
    },
    { from: "hello@uniqlo.com", subject: "Uniqlo Order Confirmation" },
    { from: "orders@lululemon.com", subject: "Your order has shipped" },
  ])("classifies known fashion retailer $from as in_scope", ({ from, subject }) => {
    expect(classifyEmailByRules({ from, subject })).toBe("in_scope");
  });

  it.each([
    { from: "info@netflix.com", subject: "Your Netflix bill is ready" },
    { from: "receipts@instacart.com", subject: "Your Instacart order receipt" },
    { from: "billing@coned.com", subject: "Your electric bill is ready" },
    { from: "orders@bestbuy.com", subject: "Your Best Buy order confirmation" },
    { from: "no-reply@spotify.com", subject: "Your Spotify Premium receipt" },
    { from: "orders@doordash.com", subject: "Your DoorDash order confirmation" },
  ])("classifies known non-fashion retailer $from as out_of_scope", ({ from, subject }) => {
    expect(classifyEmailByRules({ from, subject })).toBe("out_of_scope");
  });

  it.each([
    {
      from: "auto-confirm@amazon.com",
      subject: 'Your Amazon.com order of "Nike Running Shoes" has shipped',
    },
    { from: "orders@target.com", subject: "Your Target order confirmation" },
    { from: "noreply@some-random-boutique.example", subject: "Order Confirmation" },
  ])(
    "classifies retailers that sell both fashion and non-fashion items ($from) as ambiguous, never guessing",
    ({ from, subject }) => {
      expect(classifyEmailByRules({ from, subject })).toBe("ambiguous");
    }
  );

  it("treats a missing/unparseable sender as ambiguous rather than guessing", () => {
    expect(classifyEmailByRules({ from: "not-an-email-address", subject: "Order" })).toBe(
      "ambiguous"
    );
  });

  it("matches a subdomain of a known fashion retailer domain", () => {
    expect(
      classifyEmailByRules({ from: "orders@email.marketing.nike.com", subject: "Your order" })
    ).toBe("in_scope");
  });
});
