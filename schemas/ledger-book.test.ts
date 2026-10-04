import { describe, expect, it } from "vitest";
import { createLedgerBookSchema, renameLedgerBookSchema } from "./ledger-book";

describe("ledger book request schemas", () => {
  it("trims a valid create name", () => {
    expect(
      createLedgerBookSchema.parse({ name: "  여행  ", visibility: "shared" }),
    ).toEqual({
      name: "여행",
      visibility: "shared",
    });
  });

  it("requires a non-empty name and rejects client-owned fields", () => {
    expect(
      createLedgerBookSchema.safeParse({ name: "  ", visibility: "shared" })
        .success,
    ).toBe(false);
    expect(
      createLedgerBookSchema.safeParse({
        name: "여행",
        visibility: "shared",
        householdId: "other-household",
      }).success,
    ).toBe(false);
  });

  it("accepts only a name for rename", () => {
    expect(renameLedgerBookSchema.safeParse({ name: "  이름  " }).data).toEqual(
      { name: "이름" },
    );
    expect(
      renameLedgerBookSchema.safeParse({ name: "이름", visibility: "personal" })
        .success,
    ).toBe(false);
  });
});
