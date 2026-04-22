import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountNewForm } from "./AccountNewForm";

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      {/* 자식 SelectItem에 onValueChange를 전달하기 위해 context 대신 data 속성으로 처리 */}
      {children}
      <input
        type="hidden"
        data-select-trigger
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  ),
  SelectTrigger: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => (
    <button type="button" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: vi.fn(),
  })),
}));

const mockMutateAsync = vi.fn().mockResolvedValue({});
vi.mock("@/hooks/use-accounts", () => ({
  useCreateAccount: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AccountNewForm", () => {
  it("Step 1 초기 렌더링: 은행 계좌와 투자 계좌 선택지가 표시된다", () => {
    render(<AccountNewForm />);
    expect(screen.getByText("은행 계좌")).toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
  });

  it("은행 계좌 선택: 계좌 유형 옵션에 입출금, 적금, 예금이 있다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
    expect(screen.getByText("입출금")).toBeInTheDocument();
    expect(screen.getByText("적금")).toBeInTheDocument();
    expect(screen.getByText("예금")).toBeInTheDocument();
  });

  it("투자 계좌 선택: 계좌 유형 옵션에 일반, ISA, 연금저축, CMA가 있다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("투자 계좌"));
    expect(screen.getByText("일반")).toBeInTheDocument();
    expect(screen.getByText("ISA")).toBeInTheDocument();
    expect(screen.getByText("연금저축")).toBeInTheDocument();
    expect(screen.getByText("CMA")).toBeInTheDocument();
  });

  it("Step 2 → Step 1 뒤로가기: 이전 버튼 클릭 시 범주 선택 화면이 다시 표시된다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
    await userEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByText("은행 계좌")).toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
  });

  it("계좌명 필수 검증: 미입력 후 저장 클릭 시 에러 메시지가 표시된다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
    await userEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText("계좌명은 필수입니다.")).toBeInTheDocument();
  });

  it("저장 성공: 유효한 값 입력 후 저장 시 router.push('/assets/accounts')가 호출된다", async () => {
    mockPush.mockClear();
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
    await userEvent.type(screen.getByLabelText(/계좌명/), "국민은행 통장");
    await userEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(mockPush).toHaveBeenCalledWith("/assets/accounts");
  });
});
