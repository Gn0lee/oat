import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CategoryStatItem } from "@/lib/api/ledger-stats";
import { HomeTopCategories } from "./HomeTopCategories";

const makeItem = (
  id: string,
  name: string,
  amount: number,
  percentage: number,
): CategoryStatItem => ({
  categoryId: id,
  categoryName: name,
  categoryIcon: null,
  amount,
  percentage,
  entryCount: 1,
});

describe("HomeTopCategories", () => {
  it("items가 빈 배열이면 empty state를 표시한다", () => {
    render(<HomeTopCategories items={[]} />);
    expect(screen.getByText("이번 달 지출 내역이 없어요")).toBeInTheDocument();
  });

  it("items가 5건이면 상위 3건만 렌더링한다", () => {
    const items = [
      makeItem("1", "식비", 850_000, 22),
      makeItem("2", "주거비", 750_000, 20),
      makeItem("3", "쇼핑", 420_000, 11),
      makeItem("4", "교통비", 300_000, 8),
      makeItem("5", "의료비", 200_000, 5),
    ];
    render(<HomeTopCategories items={items} />);
    expect(screen.getByText("식비")).toBeInTheDocument();
    expect(screen.getByText("주거비")).toBeInTheDocument();
    expect(screen.getByText("쇼핑")).toBeInTheDocument();
    expect(screen.queryByText("교통비")).not.toBeInTheDocument();
    expect(screen.queryByText("의료비")).not.toBeInTheDocument();
  });

  it("카테고리명 텍스트가 존재한다", () => {
    const items = [makeItem("1", "식비", 850_000, 22)];
    render(<HomeTopCategories items={items} />);
    expect(screen.getByText("식비")).toBeInTheDocument();
  });

  it('"분석 보기" 링크가 "/ledger/analysis?scope=shared"로 연결된다', () => {
    const items = [makeItem("1", "식비", 850_000, 22)];
    render(<HomeTopCategories items={items} />);
    const link = screen.getByRole("link", { name: /분석 보기/ });
    expect(link).toHaveAttribute("href", "/ledger/analysis?scope=shared");
  });
});
