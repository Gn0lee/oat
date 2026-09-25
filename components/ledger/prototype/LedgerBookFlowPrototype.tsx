"use client";

// Throwaway comparison: three iPhone book flows on /ledger?prototype=books&variant=A|B|C.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Variant = "A" | "B" | "C";
type Screen =
  | "hub"
  | "calendar"
  | "search"
  | "analysis"
  | "manage"
  | "detail"
  | "form";
type Scope = "shared" | "personal";
type Book = {
  id: string;
  name: string;
  scope: Scope;
  archived: boolean;
  isDefault: boolean;
};
type Entry = {
  id: string;
  bookId: string;
  title: string;
  amount: number;
  date: string;
  type: "expense" | "income" | "transfer" | "non_expense_withdrawal";
  mine: boolean;
};

const initialBooks: Book[] = [
  {
    id: "living",
    name: "생활비",
    scope: "shared",
    archived: false,
    isDefault: true,
  },
  {
    id: "trip",
    name: "여행비",
    scope: "shared",
    archived: false,
    isDefault: false,
  },
  {
    id: "move",
    name: "이사비",
    scope: "shared",
    archived: false,
    isDefault: false,
  },
  {
    id: "mine",
    name: "내 저축",
    scope: "personal",
    archived: false,
    isDefault: false,
  },
  {
    id: "old",
    name: "지난 휴가",
    scope: "shared",
    archived: true,
    isDefault: false,
  },
];
const initialEntries: Entry[] = [
  {
    id: "1",
    bookId: "living",
    title: "장보기",
    amount: 82000,
    date: "2026-09-18",
    type: "expense",
    mine: true,
  },
  {
    id: "2",
    bookId: "mine",
    title: "월급",
    amount: 1500000,
    date: "2026-09-17",
    type: "income",
    mine: true,
  },
  {
    id: "3",
    bookId: "trip",
    title: "숙소 예약",
    amount: 200000,
    date: "2026-09-16",
    type: "expense",
    mine: true,
  },
  {
    id: "4",
    bookId: "trip",
    title: "항공권",
    amount: 80000,
    date: "2026-09-12",
    type: "expense",
    mine: false,
  },
  {
    id: "5",
    bookId: "move",
    title: "이사 자금 이동",
    amount: 300000,
    date: "2026-09-11",
    type: "transfer",
    mine: true,
  },
  {
    id: "6",
    bookId: "old",
    title: "작년 여행 기념품",
    amount: 45000,
    date: "2025-09-08",
    type: "expense",
    mine: true,
  },
];
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const button =
  "min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 active:bg-gray-100";
const primary =
  "min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white active:bg-indigo-700";
const row =
  "flex min-h-14 w-full items-center justify-between gap-3 border-b border-gray-100 py-3 text-left last:border-0";

export function LedgerBookFlowPrototype() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variant: Variant =
    searchParams.get("variant") === "B"
      ? "B"
      : searchParams.get("variant") === "C"
        ? "C"
        : "A";
  const [books, setBooks] = useState(initialBooks);
  const [entries, setEntries] = useState(initialEntries);
  const [bookId, setBookId] = useState("all");
  const [screen, setScreen] = useState<Screen>("hub");
  const [returnScreen, setReturnScreen] = useState<Screen>("calendar");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("2026-09-18");
  const [formBookId, setFormBookId] = useState("living");
  const [formType, setFormType] = useState<Entry["type"]>("expense");
  const [notice, setNotice] = useState("");
  const [month, setMonth] = useState("2026-09");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [monthExpanded, setMonthExpanded] = useState(false);
  const selected = books.find((book) => book.id === bookId);
  const activeBooks = books.filter((book) => !book.archived);
  const entry = entries.find((item) => item.id === entryId);
  const filtered = entries.filter(
    (item) => bookId === "all" || item.bookId === bookId,
  );
  const searchResults = filtered.filter((item) =>
    item.title.includes(query.trim()),
  );
  const expenses = filtered
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const income = filtered
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const switchVariant = (next: Variant) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`/ledger?${params.toString()}`, { scroll: false });
    setScreen("hub");
    setNotice("");
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable]")
      )
        return;
      const variants: Variant[] = ["A", "B", "C"];
      const index = variants.indexOf(variant);
      switchVariant(
        variants[(index + (event.key === "ArrowRight" ? 1 : 2)) % 3],
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const openDetail = (id: string) => {
    setEntryId(id);
    setReturnScreen(screen);
    setScreen("detail");
    setNotice("");
  };
  const openForm = (item?: Entry) => {
    setReturnScreen(item ? "detail" : screen);
    setEditing(Boolean(item));
    setEntryId(item?.id ?? null);
    setFormTitle(item?.title ?? "");
    setFormAmount(item ? String(item.amount) : "");
    setFormDate(item?.date ?? "2026-09-18");
    setFormBookId(
      item?.bookId ??
        (bookId === "all" || selected?.archived
          ? (activeBooks.find((book) => book.isDefault)?.id ?? "")
          : bookId),
    );
    setFormType(item?.type ?? "expense");
    setScreen("form");
    setNotice("");
  };
  const saveEntry = () => {
    if (
      !formTitle.trim() ||
      !Number.isFinite(Number(formAmount)) ||
      Number(formAmount) <= 0
    ) {
      setNotice("내용과 0원보다 큰 금액을 입력하세요.");
      return;
    }
    const target = books.find((book) => book.id === formBookId);
    const source = entries.find((item) => item.id === entryId);
    if (
      !target ||
      target.archived ||
      (editing && books.find((book) => book.id === source?.bookId)?.archived)
    ) {
      setNotice("보관 장부는 먼저 재활성화해야 수정하거나 이동할 수 있어요.");
      return;
    }
    const next: Entry = {
      id: editing && entryId ? entryId : String(Date.now()),
      bookId: formBookId,
      title: formTitle.trim(),
      amount: Number(formAmount),
      date: formDate,
      type: formType,
      mine: true,
    };
    setEntries((current) =>
      editing
        ? current.map((item) => (item.id === next.id ? next : item))
        : [next, ...current],
    );
    if (editing && source?.bookId !== formBookId) setBookId(formBookId);
    setEntryId(next.id);
    setScreen(editing ? "detail" : returnScreen);
    setNotice(
      editing
        ? source &&
          books.find((book) => book.id === source.bookId)?.scope !==
            target.scope
          ? "장부를 옮겼어요. 공개 대상도 새 장부에 맞게 바뀌었어요."
          : "모형에서 수정했어요. 장부 이동은 잔액을 바꾸지 않아요."
        : "모형에 기록을 추가했어요.",
    );
  };
  const addBook = (scope: Scope = "shared") => {
    const name = window.prompt("새 장부 이름", "새 목적");
    if (!name?.trim()) return;
    const id = String(Date.now());
    setBooks((current) => [
      ...current,
      { id, name: name.trim(), scope, archived: false, isDefault: false },
    ]);
    setBookId(id);
    setNotice("빈 장부를 만들었어요.");
  };
  const renameBook = (book: Book) => {
    const name = window.prompt("장부 이름 바꾸기", book.name);
    if (name?.trim())
      setBooks((current) =>
        current.map((item) =>
          item.id === book.id ? { ...item, name: name.trim() } : item,
        ),
      );
  };
  const archiveBook = (book: Book) => {
    if (book.isDefault) {
      setNotice("기본 장부를 바꾼 뒤 보관할 수 있어요.");
      return;
    }
    setBooks((current) =>
      current.map((item) =>
        item.id === book.id ? { ...item, archived: !item.archived } : item,
      ),
    );
    setNotice(
      book.archived
        ? "장부를 다시 활성화했어요."
        : "장부를 보관했어요. 지난 기록은 계속 조회할 수 있어요.",
    );
  };
  const deleteBook = (book: Book) => {
    if (entries.some((item) => item.bookId === book.id) || book.isDefault) {
      setNotice("기록이 있거나 기본인 장부는 삭제할 수 없어요.");
      return;
    }
    setBooks((current) => current.filter((item) => item.id !== book.id));
    if (bookId === book.id) setBookId("all");
    setNotice("빈 장부를 삭제했어요.");
  };
  const chooseBook = (id: string) => {
    setBookId(id);
    const archived = books.find((book) => book.id === id)?.archived;
    const latest = entries
      .filter((item) => id === "all" || item.bookId === id)
      .map((item) => item.date)
      .sort()
      .at(-1);
    const nextMonth = archived && latest ? latest.slice(0, 7) : "2026-09";
    setMonth(nextMonth);
    setSelectedDay(
      variant === "C" && latest?.startsWith(nextMonth)
        ? Number(latest.slice(-2))
        : null,
    );
    setMonthExpanded(false);
    setNotice("");
  };
  const moveMonth = (offset: number) => {
    const [year, value] = month.split("-").map(Number);
    const next = new Date(year, value - 1 + offset, 1);
    setMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
    setSelectedDay(variant === "C" ? 1 : null);
  };

  const bookSelect = (label = "장부") => (
    <label className="block text-xs font-semibold text-gray-500">
      {label}
      <select
        aria-label={label}
        className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900"
        value={bookId}
        onChange={(event) => chooseBook(event.target.value)}
      >
        <option value="all">전체 장부</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.name} · {book.scope === "shared" ? "공용" : "개인"}
            {book.archived ? " · 보관" : ""}
          </option>
        ))}
      </select>
    </label>
  );
  const entryList = (items: Entry[]) =>
    items.length ? (
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <button
            className={row}
            key={item.id}
            type="button"
            onClick={() => openDetail(item.id)}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="text-xs text-gray-500">
                {item.date} ·{" "}
                {books.find((book) => book.id === item.bookId)?.name} ·{" "}
                {item.mine ? "내 기록" : "가족 기록"}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold">
              {item.type === "income"
                ? "+"
                : item.type === "expense" ||
                    item.type === "non_expense_withdrawal"
                  ? "−"
                  : ""}
              {won(item.amount)}
            </span>
          </button>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        이 조건의 기록이 없어요.
        {selected?.archived ? " 보관 장부의 기록은 읽기 전용이에요." : ""}
      </div>
    );
  const readOnly = selected?.archived;
  const addButton = !readOnly && (
    <button type="button" className={primary} onClick={() => openForm()}>
      + 기록 추가
    </button>
  );
  const heading = (title: string) =>
    variant === "C" &&
    ["calendar", "search", "analysis"].includes(screen) ? null : (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-sm text-gray-500"
          onClick={() => {
            setScreen(
              screen === "form"
                ? returnScreen
                : screen === "detail"
                  ? returnScreen
                  : "hub",
            );
            setNotice("");
          }}
        >
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
    );

  const content = () => {
    if (screen === "calendar") {
      const [year, value] = month.split("-").map(Number);
      const dayCount = new Date(year, value, 0).getDate();
      const firstDay = new Date(year, value - 1, 1).getDay();
      const focusedDay = selectedDay ?? 18;
      const weekStart =
        focusedDay - new Date(year, value - 1, focusedDay).getDay();
      const calendarDay = (day: number) => {
        const amount = filtered
          .filter(
            (item) =>
              item.date === `${month}-${String(day).padStart(2, "0")}` &&
              item.type === "expense",
          )
          .reduce((sum, item) => sum + item.amount, 0);
        return (
          <button
            key={day}
            type="button"
            onClick={() =>
              setSelectedDay(
                variant === "C" ? day : selectedDay === day ? null : day,
              )
            }
            aria-pressed={selectedDay === day}
            className={
              variant === "C"
                ? `min-h-14 rounded-xl py-1 ${selectedDay === day ? "bg-gray-950 text-white" : "text-gray-800"}`
                : `min-h-12 rounded-lg py-1 ${selectedDay === day ? "bg-indigo-600 text-white" : amount ? "bg-indigo-50" : "bg-gray-50"}`
            }
          >
            <span className="block text-sm">{day}</span>
            {amount > 0 && (
              <span
                className={`block text-[10px] ${selectedDay === day ? "text-white" : "text-gray-500"}`}
              >
                {Math.round(amount / 10000)}만
              </span>
            )}
          </button>
        );
      };
      return (
        <div className="space-y-4">
          {heading("캘린더")}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={button}
                aria-label="이전 달"
                onClick={() => moveMonth(-1)}
              >
                ‹
              </button>
              <strong>
                {year}년 {value}월
              </strong>
              <button
                type="button"
                className={button}
                aria-label="다음 달"
                onClick={() => moveMonth(1)}
              >
                ›
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day} className="py-2 text-gray-500">
                {day}
              </span>
            ))}
            {(variant !== "C" || monthExpanded) &&
              Array.from({ length: firstDay }, (_, i) => i + 1).map((blank) => (
                <span key={`empty-${blank}`} aria-hidden="true" />
              ))}
            {Array.from(
              { length: variant === "C" && !monthExpanded ? 7 : dayCount },
              (_, i) =>
                variant === "C" && !monthExpanded ? weekStart + i : i + 1,
            ).map((day) =>
              day >= 1 && day <= dayCount ? (
                calendarDay(day)
              ) : (
                <span key={`outside-${day}`} aria-hidden="true" />
              ),
            )}
          </div>
          {variant === "C" ? (
            <button
              type="button"
              className="mx-auto block min-h-11 text-sm text-gray-500"
              aria-expanded={monthExpanded}
              onClick={() => setMonthExpanded(!monthExpanded)}
            >
              {monthExpanded ? "⌃ 월간 달력 접기" : "⌄ 월간 달력 펼치기"}
            </button>
          ) : (
            <p className="text-xs text-gray-500">
              표시 금액과 아래 목록은 현재 장부의 기록이에요.
            </p>
          )}
          <p className="text-sm font-semibold">
            {selectedDay ? `${selectedDay}일 기록` : "이번 달 기록"}
          </p>
          {entryList(
            filtered.filter((item) =>
              selectedDay
                ? item.date ===
                  `${month}-${String(selectedDay).padStart(2, "0")}`
                : item.date.startsWith(month),
            ),
          )}
          {!readOnly && (
            <button
              type="button"
              className={
                variant === "C"
                  ? "min-h-11 w-full border-t border-gray-200 pt-3 text-left text-sm font-semibold text-gray-700"
                  : `${primary} w-full`
              }
              onClick={() => openForm()}
            >
              + 기록 추가
            </button>
          )}
        </div>
      );
    }
    if (screen === "search")
      return (
        <div className="space-y-4">
          {heading("내역 검색")}
          <label className="block text-xs font-semibold text-gray-500">
            제목 검색
            <input
              aria-label="제목 검색"
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 숙소"
            />
          </label>
          <p className="text-xs text-gray-500">현재 장부에서만 검색해요.</p>
          {query.trim() ? (
            entryList(searchResults)
          ) : (
            <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              검색어를 입력해 주세요.
            </div>
          )}
        </div>
      );
    if (screen === "analysis")
      return (
        <div className="space-y-4">
          {heading("분석")}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">보이는 지출</p>
              <p className="break-all text-xl font-bold">{won(expenses)}</p>
            </div>
            <div className="min-w-0 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">보이는 수입</p>
              <p className="break-all text-xl font-bold">{won(income)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            이체는 소비 합계에서 제외해요. 보관 장부 기록은 전체 합계에 남아요.
          </p>
          {bookId === "all" && (
            <>
              <h3 className="font-semibold">장부별 지출</h3>
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  className={row}
                  onClick={() => chooseBook(book.id)}
                >
                  <span>
                    {book.name}
                    {book.archived ? " · 보관" : ""}
                  </span>
                  <strong>
                    {won(
                      filtered
                        .filter(
                          (item) =>
                            item.bookId === book.id && item.type === "expense",
                        )
                        .reduce((sum, item) => sum + item.amount, 0),
                    )}
                  </strong>
                </button>
              ))}
            </>
          )}
        </div>
      );
    if (screen === "manage")
      return (
        <div className="space-y-4">
          {heading("장부 관리")}
          <div className="flex gap-2">
            <button
              type="button"
              className={`${primary} flex-1`}
              onClick={() => addBook("shared")}
            >
              + 공용 장부
            </button>
            <button
              type="button"
              className={`${button} flex-1`}
              onClick={() => addBook("personal")}
            >
              + 개인 장부
            </button>
          </div>
          <p className="text-xs text-gray-500">
            장부 안의 모든 기록은 같은 공개 범위를 따릅니다. 개인 장부의 이름과
            기록은 만든 사람에게만 보입니다.
          </p>
          {books.map((book) => (
            <div key={book.id} className="border-b border-gray-100 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="font-semibold"
                  onClick={() => {
                    chooseBook(book.id);
                    setScreen("calendar");
                  }}
                >
                  {book.name} · {book.scope === "shared" ? "공용" : "개인"}{" "}
                  {book.isDefault && (
                    <span className="text-xs text-indigo-600">기본</span>
                  )}{" "}
                  {book.archived && (
                    <span className="text-xs text-gray-500">보관</span>
                  )}
                </button>
                <span className="text-xs text-gray-500">
                  {entries.filter((item) => item.bookId === book.id).length}건
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {!book.archived && (
                  <button
                    type="button"
                    className={button}
                    onClick={() => renameBook(book)}
                  >
                    이름 변경
                  </button>
                )}
                {!book.archived &&
                  !book.isDefault &&
                  book.scope === "shared" && (
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        setBooks((current) =>
                          current.map((item) => ({
                            ...item,
                            isDefault: item.id === book.id,
                          })),
                        );
                        setNotice(`${book.name}을 기본 장부로 지정했어요.`);
                      }}
                    >
                      기본 지정
                    </button>
                  )}
                <button
                  type="button"
                  className={button}
                  onClick={() => archiveBook(book)}
                >
                  {book.archived ? "재활성화" : "보관"}
                </button>
                {!book.archived &&
                  !book.isDefault &&
                  !entries.some((item) => item.bookId === book.id) && (
                    <button
                      type="button"
                      className={button}
                      onClick={() => deleteBook(book)}
                    >
                      빈 장부 삭제
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      );
    if (screen === "detail")
      return (
        <div className="space-y-5">
          {heading("기록 상세")}
          {entry && (
            <>
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  {entry.date} ·{" "}
                  {entry.type === "transfer"
                    ? "이체"
                    : entry.type === "non_expense_withdrawal"
                      ? "비지출 출금"
                      : entry.type === "income"
                        ? "수입"
                        : "지출"}
                </p>
                <h3 className="mt-2 text-xl font-bold">{entry.title}</h3>
                <p className="mt-2 text-3xl font-bold">{won(entry.amount)}</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>장부</dt>
                  <dd>
                    {books.find((book) => book.id === entry.bookId)?.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>공개 범위</dt>
                  <dd>
                    {books.find((book) => book.id === entry.bookId)?.scope ===
                    "shared"
                      ? "공용 장부"
                      : "개인 장부"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>작성</dt>
                  <dd>{entry.mine ? "내 기록" : "가족 기록"}</dd>
                </div>
              </dl>
              {books.find((book) => book.id === entry.bookId)?.archived ? (
                <p className="rounded-xl bg-gray-100 p-3 text-sm">
                  보관 장부의 기록이에요. 수정·재분류하려면 장부를 먼저
                  재활성화하세요.
                </p>
              ) : (
                <button
                  type="button"
                  className={`${primary} w-full`}
                  onClick={() =>
                    entry.mine
                      ? openForm(entry)
                      : setNotice(
                          "가족 공용 기록은 변경 요청으로 장부 이동을 제안해요. (모형)",
                        )
                  }
                >
                  {entry.mine ? "수정 · 장부 이동" : "변경 요청"}
                </button>
              )}
            </>
          )}
        </div>
      );
    if (screen === "form")
      return (
        <div className="space-y-4">
          {heading(editing ? "기록 수정" : "기록 추가")}
          <p className="text-xs text-gray-500">
            모형 입력이에요. 저장해도 서버에 전송되지 않아요.
          </p>
          <label className="block text-xs font-semibold text-gray-500">
            장부
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base"
              value={formBookId}
              onChange={(event) => setFormBookId(event.target.value)}
            >
              {activeBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name} · {book.scope === "shared" ? "공용" : "개인"}
                  {book.isDefault ? " · 기본" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-gray-500">
            이 기록은 선택한 장부와 같은 공개 범위를 따릅니다.
            {editing &&
              entry &&
              books.find((book) => book.id === entry.bookId)?.scope !==
                books.find((book) => book.id === formBookId)?.scope && (
                <strong className="mt-1 block text-amber-700">
                  {books.find((book) => book.id === formBookId)?.scope ===
                  "shared"
                    ? "옮기면 이 기록이 가족에게 공개됩니다."
                    : "옮기면 이 기록이 나에게만 보입니다."}
                </strong>
              )}
          </p>
          <label className="block text-xs font-semibold text-gray-500">
            종류
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base"
              value={formType}
              onChange={(event) =>
                setFormType(event.target.value as Entry["type"])
              }
            >
              <option value="expense">지출</option>
              <option value="income">수입</option>
              <option value="transfer">이체</option>
              <option value="non_expense_withdrawal">비지출 출금</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            내용
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base"
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            금액
            <input
              inputMode="numeric"
              type="number"
              min="1"
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base"
              value={formAmount}
              onChange={(event) => setFormAmount(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-gray-500">
            날짜
            <input
              type="date"
              className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base"
              value={formDate}
              onChange={(event) => setFormDate(event.target.value)}
            />
          </label>
          <div className="bg-white py-2">
            <button
              type="button"
              className={`${primary} w-full`}
              onClick={saveEntry}
            >
              모형에 저장
            </button>
          </div>
        </div>
      );
    return null;
  };

  const nav = (target: Screen, label: string) => (
    <button
      key={target}
      type="button"
      className={row}
      onClick={() => {
        setScreen(target);
        setNotice("");
      }}
    >
      <span>{label}</span>
      <span aria-hidden>›</span>
    </button>
  );
  return (
    <div className="mx-auto max-w-md pb-48 text-gray-900">
      <div className="mb-5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-3 text-xs text-indigo-900">
        <strong>목적별 장부 흐름 모형 · {variant}</strong>
        <p className="mt-1">
          모든 변경은 이 화면의 메모리에만 남아요. 새로고침하면 초기화돼요.
        </p>
        <Link
          href="/ledger"
          className="mt-2 inline-block font-semibold underline"
        >
          ← 기존 가계부로 돌아가기
        </Link>
      </div>
      {variant === "A" && (
        <div className="space-y-5">
          <div className="space-y-3">{bookSelect("현재 장부")}</div>
          {screen === "hub" ? (
            <div className="space-y-5">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-500">
                  {selected?.name ?? "전체 장부"} · 지출
                  {selected &&
                    ` · ${selected.scope === "shared" ? "공용" : "개인"}`}
                </p>
                <p className="text-3xl font-bold">{won(expenses)}</p>
                {selected?.archived && (
                  <p className="mt-2 text-sm text-gray-500">
                    보관됨 · 읽기 전용
                  </p>
                )}
              </div>
              {addButton}
              <div>
                {nav("calendar", "캘린더에서 보기")}
                {nav("search", "내역 검색")}
                {nav("analysis", "분석")}
                {nav("manage", "장부 관리")}
              </div>
            </div>
          ) : (
            content()
          )}
        </div>
      )}
      {variant === "B" && (
        <div className="space-y-5">
          {screen === "hub" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">장부 서가</p>
                  <h2 className="text-2xl font-bold">어느 장부를 볼까요?</h2>
                </div>
                <button
                  className={button}
                  type="button"
                  onClick={() => setScreen("manage")}
                >
                  관리
                </button>
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: "all",
                    name: "전체 장부",
                    scope: "shared" as Scope,
                    archived: false,
                    isDefault: false,
                  },
                  ...books,
                ].map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className="flex min-h-20 w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left"
                    onClick={() => {
                      chooseBook(book.id);
                      setScreen("calendar");
                    }}
                  >
                    <span>
                      <strong className="block text-lg">{book.name}</strong>
                      <small className="text-gray-500">
                        {book.id !== "all" &&
                          `${book.scope === "shared" ? "공용" : "개인"} · `}
                        {book.archived
                          ? "보관 · 읽기 전용"
                          : book.isDefault
                            ? "기본 장부"
                            : book.id === "all"
                              ? "보이는 장부 합산"
                              : "활성 장부"}
                      </small>
                    </span>
                    <span aria-hidden>›</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${button} w-full`}
                onClick={() => setScreen("manage")}
              >
                + 장부 만들기
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-indigo-600"
                  onClick={() => setScreen("hub")}
                >
                  ‹ 장부 서가
                </button>
                <strong>{selected?.name ?? "전체 장부"}</strong>
              </div>
              {screen !== "manage" &&
                screen !== "detail" &&
                screen !== "form" && (
                  <div className="flex gap-2 overflow-x-auto">
                    {(["calendar", "search", "analysis"] as const).map(
                      (target) => (
                        <button
                          key={target}
                          type="button"
                          className={`${button} shrink-0 ${screen === target ? "border-indigo-500 text-indigo-700" : ""}`}
                          onClick={() => setScreen(target)}
                        >
                          {target === "calendar"
                            ? "달력"
                            : target === "search"
                              ? "검색"
                              : "분석"}
                        </button>
                      ),
                    )}
                  </div>
                )}
              {content()}
            </>
          )}
        </div>
      )}
      {variant === "C" && (
        <div className="space-y-5">
          {screen === "hub" ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">전체 장부 지출</p>
                <button
                  type="button"
                  className="text-sm text-gray-500"
                  onClick={() => setScreen("manage")}
                >
                  장부 관리 ›
                </button>
              </div>
              <p className="text-3xl font-bold">
                {won(
                  entries
                    .filter((item) => item.type === "expense")
                    .reduce((sum, item) => sum + item.amount, 0),
                )}
              </p>
              <h2 className="pt-3 text-base font-bold">장부 목록</h2>
              <div className="divide-y divide-gray-100 border-y border-gray-200">
                {activeBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className={row}
                    onClick={() => {
                      chooseBook(book.id);
                      setScreen("calendar");
                    }}
                  >
                    <span>
                      <strong className="block text-sm">{book.name}</strong>
                      <small className="text-xs text-gray-500">
                        {book.scope === "shared" ? "공용" : "개인"}
                        {book.isDefault ? " · 기본 장부" : ""}
                      </small>
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      {won(
                        entries
                          .filter(
                            (item) =>
                              item.bookId === book.id &&
                              item.type === "expense",
                          )
                          .reduce((sum, item) => sum + item.amount, 0),
                      )}
                      <span aria-hidden>›</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <h2 className="text-base font-bold">전체 장부에서 보기</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(["calendar", "search", "analysis"] as const).map(
                    (target) => (
                      <button
                        key={target}
                        type="button"
                        className={button}
                        onClick={() => {
                          chooseBook("all");
                          setScreen(target);
                        }}
                      >
                        {target === "calendar"
                          ? "달력"
                          : target === "search"
                            ? "검색"
                            : "분석"}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <button
                type="button"
                className={`${primary} w-full`}
                onClick={() => openForm()}
              >
                + 기록 추가
              </button>
            </>
          ) : (
            <>
              {(["calendar", "search", "analysis"] as Screen[]).includes(
                screen,
              ) && (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-sm text-indigo-600"
                      onClick={() => setScreen("hub")}
                    >
                      ‹ 장부 목록
                    </button>
                    <select
                      aria-label="조회 장부"
                      className="min-h-11 max-w-[55%] rounded-lg bg-white px-2 text-center text-sm font-semibold"
                      value={bookId}
                      onChange={(event) => chooseBook(event.target.value)}
                    >
                      <option value="all">전체 장부</option>
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.name} ·{" "}
                          {book.scope === "shared" ? "공용" : "개인"}
                          {book.archived ? " · 보관" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-sm text-gray-500"
                      onClick={() => setScreen("manage")}
                    >
                      관리
                    </button>
                  </div>
                  {screen === "calendar" && (
                    <div className="border-b border-gray-200 pb-3">
                      <p className="text-xs text-gray-500">
                        {selected?.scope === "personal"
                          ? "개인"
                          : selected
                            ? "공용"
                            : "전체"}{" "}
                        지출
                      </p>
                      <p className="text-2xl font-bold">{won(expenses)}</p>
                      {selected?.archived && (
                        <p className="text-xs text-gray-500">
                          보관 · 읽기 전용
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 border-b border-gray-200 text-sm">
                    {(["calendar", "search", "analysis"] as const).map(
                      (target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setScreen(target)}
                          className={`min-h-11 ${screen === target ? "border-b-2 border-indigo-600 font-semibold text-indigo-700" : "text-gray-500"}`}
                        >
                          {target === "calendar"
                            ? "달력"
                            : target === "search"
                              ? "검색"
                              : "분석"}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
              {content()}
            </>
          )}
        </div>
      )}
      {notice && (
        <output className="mt-4 block rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
          {notice}
        </output>
      )}
      <details className="mt-8 border-t border-dashed border-gray-300 pt-3 text-xs text-gray-500">
        <summary className="cursor-pointer">모형 상태 보기</summary>
        <pre className="mt-2 whitespace-pre-wrap">
          {JSON.stringify(
            {
              variant,
              screen,
              book: selected?.name ?? "전체",
              scope: selected?.scope ?? "전체",
              defaultBook: books.find((book) => book.isDefault)?.name,
              books: books.map(({ name, scope, archived }) => ({
                name,
                scope,
                archived,
              })),
              entries: entries.length,
            },
            null,
            2,
          )}
        </pre>
      </details>
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-max max-w-[calc(100vw-24px)] items-center gap-3 rounded-full bg-gray-950 px-3 py-2 text-xs text-white shadow-xl">
        <button
          type="button"
          aria-label="이전 시안"
          className="min-h-9 px-2"
          onClick={() =>
            switchVariant(variant === "A" ? "C" : variant === "B" ? "A" : "B")
          }
        >
          ←
        </button>
        <span aria-live="polite">
          {variant} ·{" "}
          {variant === "A"
            ? "허브 중심"
            : variant === "B"
              ? "장부 서가"
              : "혼합안"}
        </span>
        <button
          type="button"
          aria-label="다음 시안"
          className="min-h-9 px-2"
          onClick={() =>
            switchVariant(variant === "A" ? "B" : variant === "B" ? "C" : "A")
          }
        >
          →
        </button>
      </div>
    </div>
  );
}
