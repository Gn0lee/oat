import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerTagInput } from "./LedgerTagInput";

describe("LedgerTagInput", () => {
  const mockAvailableTags = [
    { id: "1", name: "여행" },
    { id: "2", name: "데이트" },
    { id: "3", name: "회사정산" },
  ];

  it("선택된 태그들을 #이름 형식으로 렌더링한다", () => {
    render(
      <LedgerTagInput
        value={["여행", "데이트"]}
        onValueChange={vi.fn()}
        availableTags={mockAvailableTags}
      />,
    );

    expect(screen.getByText("#여행")).toBeInTheDocument();
    expect(screen.getByText("#데이트")).toBeInTheDocument();
  });

  it("태그 입력 후 엔터를 누르면 추가된다 (leading # 제거)", () => {
    const onValueChange = vi.fn();
    render(
      <LedgerTagInput
        value={[]}
        onValueChange={onValueChange}
        availableTags={mockAvailableTags}
      />,
    );

    const input = screen.getByPlaceholderText(/태그 입력/);
    fireEvent.change(input, { target: { value: "#여행" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith(["여행"]);
  });

  it("태그 X 버튼을 클릭하면 제거된다", () => {
    const onValueChange = vi.fn();
    render(
      <LedgerTagInput
        value={["여행"]}
        onValueChange={onValueChange}
        availableTags={mockAvailableTags}
      />,
    );

    const removeBtn = screen.getByLabelText(/제거 여행/i);
    fireEvent.click(removeBtn);

    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("태그가 5개인 경우 추가를 막고 에러를 표시한다", () => {
    const onValueChange = vi.fn();
    render(
      <LedgerTagInput
        value={["t1", "t2", "t3", "t4", "t5"]}
        onValueChange={onValueChange}
        availableTags={mockAvailableTags}
      />,
    );

    const input = screen.getByPlaceholderText(/태그 입력/);
    fireEvent.change(input, { target: { value: "t6" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByText(/최대 5개까지만/)).toBeInTheDocument();
  });
});
