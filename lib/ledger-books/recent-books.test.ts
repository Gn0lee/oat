import { describe, expect, it } from "vitest";
import {
  orderRecentBooks,
  type RecentBookFields,
  selectChipBooks,
  selectHubBooks,
} from "./recent-books";

function book(
  id: string,
  overrides: Partial<RecentBookFields> = {},
): RecentBookFields {
  return {
    id,
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    lastEntryAt: null,
    ...overrides,
  };
}

const ids = (books: RecentBookFields[]) => books.map((item) => item.id);

/** 기본 장부 + 최근 입력 순으로 이미 줄 선 활성 장부 n개 (생성순으로는 역순) */
function activeBooks(count: number) {
  return [
    book("default", { isDefault: true }),
    ...Array.from({ length: count - 1 }, (_, index) =>
      book(`b${index + 1}`, {
        createdAt: `2026-02-${String(20 - index).padStart(2, "0")}T00:00:00Z`,
        lastEntryAt: `2026-10-${String(20 - index).padStart(2, "0")}T00:00:00Z`,
      }),
    ),
  ];
}

describe("orderRecentBooks", () => {
  it("기록이 없어도 기본 장부를 맨 앞에 고정한다", () => {
    expect(
      ids(
        orderRecentBooks([
          book("trip", { lastEntryAt: "2026-10-06T00:00:00Z" }),
          book("default", { isDefault: true }),
        ]),
      ),
    ).toEqual(["default", "trip"]);
  });

  it("거래일이 아닌 최근 입력 시각 내림차순으로 줄 세운다", () => {
    expect(
      ids(
        orderRecentBooks([
          book("old", { lastEntryAt: "2026-09-01T00:00:00Z" }),
          book("newest", { lastEntryAt: "2026-10-06T09:00:00+09:00" }),
          book("middle", { lastEntryAt: "2026-10-05T23:00:00Z" }),
        ]),
      ),
    ).toEqual(["newest", "middle", "old"]);
  });

  it("입력 시각이 같으면 먼저 만든 장부가 앞에 온다", () => {
    const at = "2026-10-06T00:00:00Z";
    expect(
      ids(
        orderRecentBooks([
          book("later", { createdAt: "2026-03-01T00:00:00Z", lastEntryAt: at }),
          book("earlier", {
            createdAt: "2026-02-01T00:00:00Z",
            lastEntryAt: at,
          }),
        ]),
      ),
    ).toEqual(["earlier", "later"]);
  });

  it("기록 없는 장부는 기록 있는 장부 뒤에 생성순으로 놓는다", () => {
    expect(
      ids(
        orderRecentBooks([
          book("empty-late", { createdAt: "2026-05-01T00:00:00Z" }),
          book("used", {
            createdAt: "2026-06-01T00:00:00Z",
            lastEntryAt: "2026-06-02T00:00:00Z",
          }),
          book("empty-early", { createdAt: "2026-04-01T00:00:00Z" }),
          book("no-field", {
            createdAt: "2026-04-15T00:00:00Z",
            lastEntryAt: undefined,
          }),
        ]),
      ),
    ).toEqual(["used", "empty-early", "no-field", "empty-late"]);
  });

  it("보관 장부는 최근에 썼어도 맨 뒤에 둔다", () => {
    expect(
      ids(
        orderRecentBooks([
          book("archived", {
            archivedAt: "2026-10-01T00:00:00Z",
            lastEntryAt: "2026-10-06T00:00:00Z",
          }),
          book("empty"),
          book("default", { isDefault: true }),
          book("used", { lastEntryAt: "2026-09-01T00:00:00Z" }),
        ]),
      ),
    ).toEqual(["default", "used", "empty", "archived"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const books = [
      book("b", { lastEntryAt: "2026-10-06T00:00:00Z" }),
      book("a"),
    ];
    orderRecentBooks([...books].reverse());
    expect(ids(books)).toEqual(["b", "a"]);
  });
});

describe("selectHubBooks", () => {
  it("활성 장부가 4개면 모두 보여주고 전체 행은 없다", () => {
    expect(selectHubBooks(activeBooks(4))).toEqual({
      books: activeBooks(4),
      activeCount: 4,
      hasMore: false,
    });
  });

  it("활성 장부가 5개면 기본 장부 + 최근 사용 3개만 보여주고 전체 행을 둔다", () => {
    const result = selectHubBooks([...activeBooks(5)].reverse());
    expect(ids(result.books)).toEqual(["default", "b1", "b2", "b3"]);
    expect(result.activeCount).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("보관 장부는 허브와 활성 장부 수에서 뺀다", () => {
    const result = selectHubBooks([
      ...activeBooks(4),
      book("archived", { archivedAt: "2026-10-01T00:00:00Z" }),
    ]);
    expect(ids(result.books)).toEqual(["default", "b1", "b2", "b3"]);
    expect(result.activeCount).toBe(4);
    expect(result.hasMore).toBe(false);
  });
});

describe("selectChipBooks", () => {
  const archived = book("archived", {
    archivedAt: "2026-10-01T00:00:00Z",
    lastEntryAt: "2026-10-30T00:00:00Z",
  });

  it("보관 장부를 포함해 6개면 모두 보여주고 장부 선택은 없다", () => {
    const books = [archived, ...activeBooks(5)];
    expect(selectChipBooks(books)).toEqual({
      books: [...activeBooks(5), archived],
      hasPicker: false,
    });
  });

  it("보관 장부를 포함해 7개면 기본 장부 + 최근 사용 활성 장부 5개와 장부 선택을 둔다", () => {
    const result = selectChipBooks([archived, ...activeBooks(6)]);
    expect(ids(result.books)).toEqual([
      "default",
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
    ]);
    expect(result.hasPicker).toBe(true);
  });

  it("칩 밖 활성 장부가 선택되면 맨 앞에 임시 칩으로 넣는다", () => {
    const result = selectChipBooks(activeBooks(8), "b7");
    expect(ids(result.books)).toEqual([
      "b7",
      "default",
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
    ]);
    expect(result.hasPicker).toBe(true);
  });

  it("직접 링크로 보관 장부가 선택되면 그 장부를 임시 칩으로 넣는다", () => {
    const result = selectChipBooks([...activeBooks(7), archived], "archived");
    expect(ids(result.books)[0]).toBe("archived");
    expect(result.books).toHaveLength(7);
  });

  it("칩 안의 장부가 선택되면 순서를 바꾸지 않는다", () => {
    expect(ids(selectChipBooks(activeBooks(7), "b2").books)).toEqual([
      "default",
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
    ]);
  });

  it("보이지 않는 장부 ID가 선택되면 임시 칩을 만들지 않는다", () => {
    expect(ids(selectChipBooks(activeBooks(7), "missing").books)).toHaveLength(
      6,
    );
  });
});
