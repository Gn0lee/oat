import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerTagFilter } from "./LedgerTagFilter";

describe("LedgerTagFilter", () => {
  const mockTags = [
    { id: "1", name: "여행" },
    { id: "2", name: "데이트" },
  ];

  it("선택된 태그들을 렌더링하고 클릭 시 이벤트를 발생시킨다", () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <LedgerTagFilter
        tags={mockTags}
        selectedIds={["1"]}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );

    // Filter Trigger Button
    const trigger = screen.getByRole("button", { name: /태그 필터/i });
    expect(trigger).toBeInTheDocument();

    // 이 구현은 Popover 또는 Badge 형태가 될 수 있다.
    // 만약 trigger를 클릭하면 리스트가 나타나도록 설계한다면:
    fireEvent.click(trigger);

    // 데이트 태그를 클릭하여 활성화 시도
    const tagOption = screen.getByText("#데이트");
    fireEvent.click(tagOption);

    expect(onSelectedIdsChange).toHaveBeenCalledWith(["1", "2"]);
  });

  it("초기화 버튼 클릭 시 빈 배열을 반환한다", () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <LedgerTagFilter
        tags={mockTags}
        selectedIds={["1"]}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );

    const clearBtn = screen.getByRole("button", { name: /필터 해제/i });
    fireEvent.click(clearBtn);

    expect(onSelectedIdsChange).toHaveBeenCalledWith([]);
  });
});
