import { describe, expect, it } from "vitest";
import { retailerFromRawInput } from "./retailer";

describe("retailerFromRawInput", () => {
  it("takes the host of a pasted link, without www", () => {
    expect(retailerFromRawInput("https://www.example-shop.com/p/123?ref=x")).toEqual({
      name: "example-shop.com",
      url: "https://www.example-shop.com/p/123?ref=x",
    });
  });

  it("returns null for typed text, which has no link to go to", () => {
    expect(retailerFromRawInput("a navy blazer, wool")).toBeNull();
  });

  it("returns null for non-web links and missing input", () => {
    expect(retailerFromRawInput("javascript:alert(1)")).toBeNull();
    expect(retailerFromRawInput(null)).toBeNull();
    expect(retailerFromRawInput("")).toBeNull();
  });
});
