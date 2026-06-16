import { describe, expect, it } from "vitest";
import { formatCompactCurrency, formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats positive KRW values with '원' suffix", () => {
    expect(formatCurrency(10000)).toBe("10,000원");
  });

  it("formats negative KRW values with '-' prefix and '원' suffix", () => {
    expect(formatCurrency(-10000)).toBe("-10,000원");
  });

  it("formats USD values with '$' prefix", () => {
    // ko-KR locale formatting for USD style: "currency" may produce US$ or $ depending on platform/Node.
    // Let's assert it contains "$" and correct formatted numbers.
    const formatted = formatCurrency(1234.56, "USD");
    expect(formatted).toContain("$");
    expect(formatted).toContain("1,234.56");
  });
});

describe("formatCompactCurrency", () => {
  it("formats KRW values under 100 million compactly using 만원", () => {
    expect(formatCompactCurrency(414000)).toBe("41.4만원");
  });

  it("formats KRW values over 100 million compactly using 억원", () => {
    expect(formatCompactCurrency(125000000)).toBe("1.25억원");
  });

  it("formats negative KRW values compactly", () => {
    expect(formatCompactCurrency(-414000)).toBe("-41.4만원");
  });

  it("formats small KRW values with 원 suffix", () => {
    expect(formatCompactCurrency(5000)).toBe("5,000원");
  });

  it("formats USD compact currency keeping the $ symbol", () => {
    const formatted = formatCompactCurrency(1250, "USD");
    expect(formatted).toContain("$");
    expect(formatted).toMatch(/1(\.2|\.25|\.3)?K/); // e.g. $1.2K or $1.25K or $1.3K depending on browser/runtime compact notation
  });
});
