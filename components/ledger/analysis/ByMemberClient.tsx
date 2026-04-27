"use client";

import { startOfMonth } from "date-fns";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { PageHeader } from "@/components/layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLedgerStatsByMember } from "@/hooks/use-ledger-stats";
import { formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./MonthSelector";

const MEMBER_COLORS = ["#4F46E5", "#F04452", "#3182F6", "#F59E0B", "#10B981"];

export function ByMemberClient() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const { data, isLoading } = useLedgerStatsByMember(year, month);

  const members = data?.members ?? [];

  const donutData = useMemo(
    () =>
      members.map((m, i) => ({
        name: m.memberName,
        value: m.sharedExpense,
        fill: MEMBER_COLORS[i % MEMBER_COLORS.length],
      })),
    [members],
  );

  const totalShared = donutData.reduce((s, d) => s + d.value, 0);

  const donutConfig = useMemo(
    () =>
      Object.fromEntries(
        members.map((m, i) => [
          m.memberId,
          {
            label: m.memberName,
            color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          },
        ]),
      ),
    [members],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="구성원별 지출" backHref="/ledger/analysis" />
      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

      {/* 섹션 1: 구성원 요약 카드 */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-2 gap-3">
          <div className="bg-gray-200 rounded-2xl h-24" />
          <div className="bg-gray-200 rounded-2xl h-24" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member, i) => {
            const ratio =
              totalShared > 0
                ? Math.round((member.sharedExpense / totalShared) * 1000) / 10
                : 0;
            return (
              <div
                key={member.memberId}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length],
                    }}
                  />
                  <span className="font-semibold text-gray-900 text-sm">
                    {member.memberName}
                  </span>
                  {member.isCurrentUser && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      나
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(member.sharedExpense)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  공용 지출 {ratio.toFixed(1)}% 기여
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 섹션 2: 비중 도넛 차트 */}
      {!isLoading && donutData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            공용 지출 비중
          </h3>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <ChartContainer config={donutConfig} className="size-40 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={68}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="flex-1 space-y-2 w-full">
              {donutData.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!isLoading && members.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-400 text-sm">
            이번 달 공용 지출 데이터가 없어요
          </p>
        </div>
      )}
    </div>
  );
}
