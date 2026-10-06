import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBook, useLedgerBookActions } from "@/hooks/use-ledger-books";
import { useLedgerIdentity } from "@/hooks/use-ledger-identity";
import { ApiQueryError } from "@/lib/api/client";
import { safeLedgerReturnTo } from "@/lib/ledger-books/navigation";
import { LedgerBookDetailClient } from "./LedgerBookDetailClient";

const replace = vi.fn();
const archive = { mutateAsync: vi.fn(), isPending: false };
const rename = { mutateAsync: vi.fn(), isPending: false };
const reactivate = { mutateAsync: vi.fn(), isPending: false };
const makeDefault = { mutateAsync: vi.fn(), isPending: false };
const remove = { mutateAsync: vi.fn(), isPending: false };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));
vi.mock("@/hooks/use-ledger-books", () => ({
  useLedgerBook: vi.fn(),
  useLedgerBookActions: vi.fn(),
}));
vi.mock("@/hooks/use-ledger-identity", () => ({ useLedgerIdentity: vi.fn() }));

const sharedBook = {
  id: "shared-id",
  name: "생활비",
  visibility: "shared" as const,
  createdBy: "member-1",
  isDefault: false,
  archivedAt: null,
  createdAt: "now",
  updatedAt: "now",
};

describe("LedgerBookDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLedgerBook).mockReturnValue({
      data: sharedBook,
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useLedgerBookActions).mockReturnValue({
      archive,
      rename,
      reactivate,
      makeDefault,
      remove,
      create: { mutateAsync: vi.fn(), isPending: false },
    } as never);
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "member-2",
      householdId: "household-1",
      role: "member",
    });
  });

  it("lets a household member manage a shared book but not change the default", () => {
    render(
      <LedgerBookDetailClient
        id="shared-id"
        returnTo="/ledger/records?book=shared-id"
      />,
    );

    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "보관하기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "기본 장부로 설정" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "관리 마치기" })).toHaveAttribute(
      "href",
      "/ledger/records?book=shared-id",
    );
  });

  it("keeps the detail open and reports a 409 archive conflict", async () => {
    archive.mutateAsync.mockRejectedValueOnce(
      new Error("기본 장부를 변경한 뒤 다시 시도해주세요."),
    );
    render(<LedgerBookDetailClient id="shared-id" />);

    fireEvent.click(screen.getByRole("button", { name: "보관하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "기본 장부를 변경한 뒤 다시 시도해주세요.",
    );
    expect(screen.getByRole("heading", { name: "생활비" })).toBeInTheDocument();
  });

  it("does not offer archive or default actions to a member on the default shared book", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...sharedBook, isDefault: true },
      isLoading: false,
      error: null,
    } as never);

    render(<LedgerBookDetailClient id="shared-id" />);

    expect(
      screen.queryByRole("button", { name: "보관하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "기본 장부로 설정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("다른 공용 장부를 기본으로 바꾼 뒤 보관할 수 있어요."),
    ).toBeInTheDocument();
  });

  it("makes archived books read-only until they are reactivated", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...sharedBook, archivedAt: "yesterday" },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "owner-1",
      householdId: "household-1",
      role: "owner",
    });

    render(<LedgerBookDetailClient id="shared-id" />);

    expect(screen.getByText(/보관됨 · 읽기 전용/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "저장" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "보관하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "삭제하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 사용하기" }),
    ).toBeInTheDocument();
  });

  it("keeps the originating return route after archiving", async () => {
    archive.mutateAsync.mockResolvedValueOnce({
      ...sharedBook,
      archivedAt: "now",
    });
    render(
      <LedgerBookDetailClient
        id="shared-id"
        returnTo="/ledger/records?book=shared-id"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "보관하기" }));

    await waitFor(() =>
      expect(archive.mutateAsync).toHaveBeenCalledWith({ id: "shared-id" }),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "관리 마치기" })).toHaveAttribute(
      "href",
      "/ledger/records?book=shared-id",
    );
  });

  it("returns to the originating safe route after successful deletion", async () => {
    remove.mutateAsync.mockResolvedValueOnce({ success: true });
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "owner-1",
      householdId: "household-1",
      role: "owner",
    });
    render(
      <LedgerBookDetailClient
        id="shared-id"
        returnTo="/ledger/records?book=shared-id"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "삭제하기",
      }),
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/ledger/records?book=shared-id"),
    );
  });

  it("returns focus to the delete trigger when the confirmation closes", async () => {
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "owner-1",
      householdId: "household-1",
      role: "owner",
    });
    render(<LedgerBookDetailClient id="shared-id" />);

    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "삭제하기" });
    await user.click(trigger);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }),
    );

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not offer personal book actions to an owner who is not its creator", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: { ...sharedBook, visibility: "personal", createdBy: "member-1" },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "owner-1",
      householdId: "household-1",
      role: "owner",
    });

    render(<LedgerBookDetailClient id="personal-id" />);

    expect(
      screen.queryByRole("button", { name: "저장" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "보관하기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "삭제하기" }),
    ).not.toBeInTheDocument();
  });

  it("lets the creator rename and delete the migrated 개인 생활비 like any personal book", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: {
        ...sharedBook,
        name: "개인 생활비",
        visibility: "personal",
        createdBy: "member-2",
      },
      isLoading: false,
      error: null,
    } as never);

    render(<LedgerBookDetailClient id="personal-id" />);

    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "삭제하기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("현재 이 장부는 이름을 바꾸거나 삭제할 수 없어요."),
    ).not.toBeInTheDocument();
  });

  it("shows an unavailable state instead of exposing inaccessible personal books", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiQueryError("BOOK_UNAVAILABLE", "missing", 404),
    } as never);

    render(
      <LedgerBookDetailClient id="private-id" returnTo="https://example.com" />,
    );

    expect(screen.getByText("장부를 볼 수 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "전체 기록으로 이동" }),
    ).toHaveAttribute("href", "/ledger/records");
    expect(screen.queryByText("개인 생활비")).not.toBeInTheDocument();
  });

  it("offers household setup instead of retrying a disabled detail query", () => {
    vi.mocked(useLedgerIdentity).mockReturnValue({
      userId: "owner-1",
      householdId: null,
      role: null,
    });
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: true,
      error: null,
    } as never);

    render(<LedgerBookDetailClient id="shared-id" />);

    expect(screen.getByText("가구 설정이 필요해요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "가구 설정으로 이동" }),
    ).toHaveAttribute("href", "/settings/household");
    expect(
      screen.queryByRole("button", { name: "다시 시도" }),
    ).not.toBeInTheDocument();
  });

  it("offers retry on a transient error", () => {
    vi.mocked(useLedgerBook).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiQueryError("INTERNAL_ERROR", "server error", 500),
      refetch: vi.fn(),
      isFetching: false,
    } as never);

    render(<LedgerBookDetailClient id="shared-id" />);

    expect(screen.getByText("장부를 불러올 수 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("장부가 없거나 접근할 수 없어요."),
    ).not.toBeInTheDocument();
  });

  it("treats only local ledger paths as return destinations", () => {
    expect(
      safeLedgerReturnTo("/ledger/records?book=book-id", "/ledger/books"),
    ).toBe("/ledger/records?book=book-id");
    expect(safeLedgerReturnTo("//example.com/steal", "/ledger/books")).toBe(
      "/ledger/books",
    );
  });
});
