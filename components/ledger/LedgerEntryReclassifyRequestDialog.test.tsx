import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerBooks } from "@/hooks/use-ledger-books";
import { useCreateRecordChangeRequest } from "@/hooks/use-record-change-requests";
import { ApiQueryError } from "@/lib/api/client";
import type { LedgerEntryWithDetails } from "@/lib/api/ledger";
import { LedgerEntryReclassifyRequestDialog } from "./LedgerEntryReclassifyRequestDialog";

vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => true }));
vi.mock("@/hooks/use-ledger-books", () => ({ useLedgerBooks: vi.fn() }));
vi.mock("@/hooks/use-record-change-requests", () => ({
  useCreateRecordChangeRequest: vi.fn(),
}));
const invalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const entry = {
  id: "entry-1",
  ownerId: "owner-1",
  ownerName: "홍길동",
  type: "expense",
  amount: 32000,
  title: "저녁",
  bookId: "book-living",
  book: { name: "생활비", visibility: "shared", archivedAt: null },
  isShared: true,
  transactedAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T01:02:03.123456+00:00",
} as unknown as LedgerEntryWithDetails;

const books = [
  { id: "book-living", name: "생활비", visibility: "shared", archivedAt: null },
  { id: "book-trip", name: "여행", visibility: "shared", archivedAt: null },
  {
    id: "book-old",
    name: "지난 이사",
    visibility: "shared",
    archivedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "book-mine",
    name: "내 용돈",
    visibility: "personal",
    archivedAt: null,
  },
];

const mutateAsync = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLedgerBooks).mockReturnValue({
    data: books,
    isLoading: false,
  } as never);
  vi.mocked(useCreateRecordChangeRequest).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as never);
});

describe("LedgerEntryReclassifyRequestDialog", () => {
  it("현재 장부를 뺀 활성 공용 장부만 선택지로 보여준다", () => {
    render(
      <LedgerEntryReclassifyRequestDialog
        entry={entry}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "여행" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "생활비" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "지난 이사" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "내 용돈" })).toBeNull();
    expect(screen.getByText(/생활비/)).toBeInTheDocument();
  });

  it("선택한 장부와 기록 버전만 담아 요청한다", async () => {
    const onOpenChange = vi.fn();
    mutateAsync.mockResolvedValueOnce({ id: "request-1" });
    render(
      <LedgerEntryReclassifyRequestDialog
        entry={entry}
        open
        onOpenChange={onOpenChange}
      />,
    );

    const submit = screen.getByRole("button", { name: "요청 보내기" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "여행" }));
    fireEvent.change(screen.getByLabelText("작성자에게 남길 말 (선택)"), {
      target: { value: "여행 경비예요" },
    });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        targetType: "ledger_entry",
        targetId: "entry-1",
        requestType: "reclassify",
        proposedChanges: { bookId: "book-trip" },
        expectedEntryUpdatedAt: "2026-10-01T01:02:03.123456+00:00",
        message: "여행 경비예요",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it("기록이 바뀌었으면 안내하고 기록을 다시 불러온다", async () => {
    mutateAsync.mockRejectedValueOnce(
      new ApiQueryError("ENTRY_CHANGED", "기록이 바뀌었습니다.", 409),
    );
    render(
      <LedgerEntryReclassifyRequestDialog
        entry={entry}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "여행" }));
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("기록이 바뀌었습니다."),
    );
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it("옮길 수 있는 공용 장부가 없으면 안내한다", () => {
    vi.mocked(useLedgerBooks).mockReturnValue({
      data: [books[0], books[2], books[3]],
      isLoading: false,
    } as never);
    render(
      <LedgerEntryReclassifyRequestDialog
        entry={entry}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("옮길 수 있는 다른 공용 장부가 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "요청 보내기" })).toBeDisabled();
  });
});
