import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectTypeStep } from "./SelectTypeStep";

describe("SelectTypeStep", () => {
  it("이체 유형을 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<SelectTypeStep onSelect={onSelect} onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /이체/ }));

    expect(onSelect).toHaveBeenCalledWith("transfer");
  });
});
