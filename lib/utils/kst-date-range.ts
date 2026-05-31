const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface IsoDateRange {
  from: string;
  to: string;
}

export function getKstMonthRange(year: number, month: number): IsoDateRange {
  const from = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET_MS);
  const to = new Date(Date.UTC(year, month, 1) - KST_OFFSET_MS);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function getKstDayRange(date: string): IsoDateRange {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("date는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const fromTime = Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
  const from = new Date(fromTime);
  const to = new Date(fromTime + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
