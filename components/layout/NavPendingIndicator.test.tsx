import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavPendingIndicator } from "./NavPendingIndicator";

vi.mock("next/link", () => ({
  useLinkStatus: vi.fn(() => ({ pending: false })),
}));

import { useLinkStatus } from "next/link";

describe("NavPendingIndicator", () => {
  it("링크 이동이 pending 상태가 아니면 표시하지 않는다", () => {
    vi.mocked(useLinkStatus).mockReturnValue({ pending: false });

    const { container } = render(<NavPendingIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  it("링크 이동이 pending 상태이면 로딩 아이콘을 표시한다", () => {
    vi.mocked(useLinkStatus).mockReturnValue({ pending: true });

    render(<NavPendingIndicator />);

    expect(screen.getByLabelText("페이지 이동 중")).toBeInTheDocument();
  });
});
