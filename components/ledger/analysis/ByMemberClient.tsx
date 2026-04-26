"use client";

import { startOfMonth } from "date-fns";
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
        value: m.sharedExpense + m.personalExpense,
        fill: MEMBER_COLORS[i % MEMBER_COLORS.length],
      })),
    [members],
  );

  const barData = useMemo(
    () =>
      members.map((m) => ({
        name: m.memberName,
        sharedExpense: m.sharedExpense,
        personalExpense: m.personalExpenseVisible ? m.personalExpense : 0,
      })),
    [members],
  );

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
          <div className="bg-gray-200 rounded-2xl h-32" />
          <div className="bg-gray-200 rounded-2xl h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member, i) => (
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
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">공용 지출</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(member.sharedExpense)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">개인 지출</span>
                  {member.personalExpenseVisible ? (
                    <span className="font-medium text-gray-900">
                      {formatCurrency(member.personalExpense)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <Lock className="w-3 h-3" />
                      비공개
                    </span>
                  )}
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">공용 합계</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(member.sharedExpense)}
                  </span>
                </div>
              </div>
            </div>
          ))}
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

      {/* 섹션 3: 공용/개인 grouped bar */}
      {!isLoading && barData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            공용 · 개인 지출 비교
          </h3>
          <ChartContainer
            config={{
              sharedExpense: { label: "공용", color: "#4F46E5" },
              personalExpense: { label: "개인", color: "#3182F6" },
            }}
            className="h-[180px]"
          >
            <BarChart
              data={barData}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${Math.floor(v / 10000)}만`}
                tick={{ fontSize: 11 }}
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="sharedExpense"
                name="공용"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="personalExpense"
                name="개인"
                fill="#3182F6"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {!isLoading && members.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-400 text-sm">이번 달 데이터가 없어요</p>
        </div>
      )}
    </div>
  );
}
