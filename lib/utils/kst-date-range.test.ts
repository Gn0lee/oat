import { describe, expect, it } from "vitest";
import { getKstDayRange, getKstMonthRange } from "./kst-date-range";

describe("KST date ranges", () => {
  it("builds an inclusive-exclusive KST month range", () => {
    expect(getKstMonthRange(2026, 5)).toEqual({
      from: "2026-04-30T15:00:00.000Z",
      to: "2026-05-31T15:00:00.000Z",
    });
  });

  it("builds an inclusive-exclusive KST day range", () => {
    expect(getKstDayRange("2026-05-14")).toEqual({
      from: "2026-05-13T15:00:00.000Z",
      to: "2026-05-14T15:00:00.000Z",
    });
  });
});
