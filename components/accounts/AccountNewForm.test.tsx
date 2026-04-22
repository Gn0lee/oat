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
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
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

vi.mock("@/hooks/use-accounts", () => ({
  useCreateAccount: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

describe("AccountNewForm - Step 1: 계좌 카테고리 선택", () => {
  it("은행 계좌와 투자 계좌 선택 카드가 표시된다", () => {
    render(<AccountNewForm />);
    expect(screen.getByText("은행 계좌")).toBeInTheDocument();
    expect(screen.getByText("투자 계좌")).toBeInTheDocument();
  });

  it("은행 계좌 선택 시 Step 2로 이동한다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
    expect(screen.getByLabelText(/계좌명/)).toBeInTheDocument();
  });

  it("투자 계좌 선택 시 Step 2로 이동한다", async () => {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("투자 계좌"));
    expect(screen.getByLabelText(/계좌명/)).toBeInTheDocument();
  });
});

describe("AccountNewForm - Step 2: 은행 계좌 상세 폼", () => {
  async function renderStep2Bank() {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("은행 계좌"));
  }

  it("계좌명 입력 필드가 있다", async () => {
    await renderStep2Bank();
    expect(screen.getByLabelText(/계좌명/)).toBeInTheDocument();
  });

  it("은행 입력 필드가 있다", async () => {
    await renderStep2Bank();
    expect(screen.getByLabelText(/은행/)).toBeInTheDocument();
  });

  it("계좌번호 입력 필드가 있다", async () => {
    await renderStep2Bank();
    expect(screen.getByLabelText(/계좌번호/)).toBeInTheDocument();
  });

  it("잔액 입력 필드가 있다", async () => {
    await renderStep2Bank();
    expect(screen.getByLabelText(/잔액/)).toBeInTheDocument();
  });

  it("기본 계좌 체크박스가 있다", async () => {
    await renderStep2Bank();
    expect(screen.getByLabelText(/기본 계좌/)).toBeInTheDocument();
  });

  it("계좌명을 입력하지 않고 저장하면 에러 메시지가 표시된다", async () => {
    await renderStep2Bank();
    await userEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(await screen.findByText("계좌명은 필수입니다.")).toBeInTheDocument();
  });
});

describe("AccountNewForm - Step 2: 투자 계좌 상세 폼", () => {
  async function renderStep2Investment() {
    render(<AccountNewForm />);
    await userEvent.click(screen.getByText("투자 계좌"));
  }

  it("증권사/은행 라벨이 표시된다", async () => {
    await renderStep2Investment();
    expect(screen.getByLabelText(/증권사/)).toBeInTheDocument();
  });

  it("잔액 입력 필드가 있다", async () => {
    await renderStep2Investment();
    expect(screen.getByLabelText(/잔액/)).toBeInTheDocument();
  });
});
