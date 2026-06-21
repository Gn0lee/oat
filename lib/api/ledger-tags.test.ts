import { describe, expect, it } from "vitest";
import {
  normalizeLedgerTagInputs,
  normalizeLedgerTagName,
  validateLedgerTagName,
} from "./ledger-tags";

describe("ledger-tags domain", () => {
  describe("normalizeLedgerTagName", () => {
    it("앞뒤 공백을 제거하고 leading #를 제거한다", () => {
      expect(normalizeLedgerTagName(" #여행 ")).toBe("여행");
      expect(normalizeLedgerTagName("여행")).toBe("여행");
      expect(normalizeLedgerTagName("#여행")).toBe("여행");
    });

    it("영어 대문자 대소문자를 그대로 유지한다", () => {
      expect(normalizeLedgerTagName("Travel")).toBe("Travel");
      expect(normalizeLedgerTagName("#TRAVEL")).toBe("TRAVEL");
    });

    it("내부의 #은 제거하지 않는다", () => {
      expect(normalizeLedgerTagName("foo#bar")).toBe("foo#bar");
    });
  });

  describe("validateLedgerTagName", () => {
    it("유효한 태그 이름은 검증을 통과한다", () => {
      expect(() => validateLedgerTagName("여행")).not.toThrow();
      expect(() => validateLedgerTagName("travel_123")).not.toThrow();
      expect(() => validateLedgerTagName("식비")).not.toThrow();
    });

    it("빈 값은 예외를 던진다", () => {
      expect(() => validateLedgerTagName("")).toThrow(
        expect.objectContaining({ code: "LEDGER_TAG_INVALID_NAME" }),
      );
    });

    it("15자를 초과하면 예외를 던진다", () => {
      expect(() => validateLedgerTagName("abcdefghijklmnop")).toThrow(
        expect.objectContaining({ code: "LEDGER_TAG_INVALID_NAME" }),
      );
    });

    it("공백이 포함되면 예외를 던진다", () => {
      expect(() => validateLedgerTagName("일 이")).toThrow(
        expect.objectContaining({ code: "LEDGER_TAG_INVALID_NAME" }),
      );
    });

    it("허용되지 않은 문자가 포함되면 예외를 던진다", () => {
      expect(() => validateLedgerTagName("카페!")).toThrow(
        expect.objectContaining({ code: "LEDGER_TAG_INVALID_NAME" }),
      );
    });
  });

  describe("normalizeLedgerTagInputs", () => {
    it("여러 입력 태그들을 정규화하고 중복을 제거하며 첫번째 매칭된 대소문자를 유지한다", () => {
      const inputs = ["#Travel", "travel", "#여행", "여행"];
      const result = normalizeLedgerTagInputs(inputs);
      expect(result).toEqual(["Travel", "여행"]);
    });

    it("5개 이하의 태그는 통과한다", () => {
      const inputs = ["t1", "t2", "t3", "t4", "t5"];
      expect(normalizeLedgerTagInputs(inputs)).toEqual([
        "t1",
        "t2",
        "t3",
        "t4",
        "t5",
      ]);
    });

    it("5개를 초과하면 예외를 던진다", () => {
      const inputs = ["t1", "t2", "t3", "t4", "t5", "t6"];
      expect(() => normalizeLedgerTagInputs(inputs)).toThrow(
        expect.objectContaining({ code: "LEDGER_TAG_LIMIT_EXCEEDED" }),
      );
    });
  });
});
