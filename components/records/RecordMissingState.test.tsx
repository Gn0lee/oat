import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordMissingState } from "./RecordMissingState";

describe("RecordMissingState", () => {
  it("삭제되었거나 접근할 수 없는 기록 상태를 친근하게 보여준다", () => {
    render(
      <RecordMissingState
        title="기록을 찾을 수 없습니다"
        description="삭제되었거나 접근 권한이 없는 기록입니다."
        actionHref="/ledger/records"
        actionLabel="기록 목록으로 이동"
      />,
    );

    expect(screen.getByText("기록을 찾을 수 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText("삭제되었거나 접근 권한이 없는 기록입니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "기록 목록으로 이동" }),
    ).toHaveAttribute("href", "/ledger/records");
  });
});
