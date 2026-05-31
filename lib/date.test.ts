import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatKst,
  fromKstDate,
  getKstDayRange,
  getKstMonthRange,
  getKstNow,
  getKstToday,
  toKstDate,
} from "./date";

describe("date utilities", () => {
  describe("formatKst", () => {
    it("formats UTC date string to KST correctly", () => {
      // UTC: 2026-05-31T03:00:00Z -> KST: 2026-05-31 12:00:00
      const d = "2026-05-31T03:00:00.000Z";
      expect(formatKst(d, "yyyy-MM-dd HH:mm")).toBe("2026-05-31 12:00");
      expect(formatKst(d)).toBe("2026-05-31");
    });

    it("formats timestamp number to KST correctly", () => {
      // UTC: 2026-01-01T20:00:00Z -> KST: 2026-01-02 05:00:00
      const timestamp = new Date("2026-01-01T20:00:00.000Z").getTime();
      expect(formatKst(timestamp)).toBe("2026-01-02");
    });

    it("handles null or undefined safely", () => {
      expect(formatKst(null)).toBe("");
      expect(formatKst(undefined)).toBe("");
    });
  });

  describe("time-dependent utilities", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set system time to UTC: 2026-05-31T20:00:00Z
      // This is KST: 2026-06-01 05:00:00
      vi.setSystemTime(new Date("2026-05-31T20:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("getKstNow", () => {
      it("returns a Date object with KST shifted values", () => {
        const now = getKstNow();
        expect(now.getFullYear()).toBe(2026);
        expect(now.getMonth()).toBe(5); // June is 5 (0-indexed)
        expect(now.getDate()).toBe(1);
        expect(now.getHours()).toBe(5);
      });
    });

    describe("getKstToday", () => {
      it("returns today's date string in KST", () => {
        expect(getKstToday()).toBe("2026-06-01");
      });
    });
  });

  describe("toKstDate", () => {
    it("converts absolute UTC time to a Date object where local methods return KST", () => {
      // 2026-12-31T20:00:00Z -> KST 2027-01-01 05:00:00
      const d = toKstDate("2026-12-31T20:00:00.000Z");
      expect(d.getFullYear()).toBe(2027);
      expect(d.getMonth()).toBe(0); // Jan is 0
      expect(d.getDate()).toBe(1);
    });
  });

  describe("fromKstDate", () => {
    it("converts a Date constructed from local time into an absolute UTC Date interpreting the values as KST", () => {
      // System constructs a Date for 2026-05-31 09:00:00 locally
      // We want to treat it as "2026-05-31 09:00:00 KST"
      // Which means it should be 2026-05-31T00:00:00.000Z in absolute time.
      const localDate = new Date(2026, 4, 31, 9, 0, 0); // May is 4
      const utcDate = fromKstDate(localDate);
      expect(utcDate.toISOString()).toBe("2026-05-31T00:00:00.000Z");
    });
  });

  describe("getKstMonthRange", () => {
    it("returns ISO UTC boundaries for a given KST month", () => {
      // 2026년 5월 (KST)
      // 시작: 2026-05-01 00:00:00 KST -> 2026-04-30T15:00:00.000Z
      // 종료: 2026-06-01 00:00:00 KST -> 2026-05-31T15:00:00.000Z
      const range = getKstMonthRange(2026, 5);
      expect(range.from).toBe("2026-04-30T15:00:00.000Z");
      expect(range.to).toBe("2026-05-31T15:00:00.000Z");
    });
  });

  describe("getKstDayRange", () => {
    it("returns ISO UTC boundaries for a given KST day", () => {
      // 2026-05-31 (KST)
      // 시작: 2026-05-31 00:00:00 KST -> 2026-05-30T15:00:00.000Z
      // 종료: 2026-06-01 00:00:00 KST -> 2026-05-31T15:00:00.000Z
      const range = getKstDayRange("2026-05-31");
      expect(range.from).toBe("2026-05-30T15:00:00.000Z");
      expect(range.to).toBe("2026-05-31T15:00:00.000Z");
    });
  });
});
