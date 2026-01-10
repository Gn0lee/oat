"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDomesticMarketTrend } from "@/hooks/use-market-trend";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { MarketTrendItem } from "@/types";

// ============================================================================
// 타입 정의
// ============================================================================

type RankChange = "up" | "down" | "new" | "same";

interface TrendCardProps {
  title: string;
  icon: React.ReactNode;
  items: MarketTrendItem[];
  type: "volume" | "gainer" | "loser";
  previousItems: MarketTrendItem[];
}

// ============================================================================
// 애니메이션 설정
// ============================================================================

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 순위 변동 계산
 */
function getRankChange(
  ticker: string,
  currentRank: number,
  previousItems: MarketTrendItem[],
): RankChange {
  const prevItem = previousItems.find((item) => item.ticker === ticker);

  if (!prevItem) return "new";

  if (currentRank < prevItem.rank) return "up";
  if (currentRank > prevItem.rank) return "down";
  return "same";
}

/**
 * 거래량 포맷팅 (만주 단위)
 */
function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(0)}만주`;
  }
  return `${volume.toLocaleString()}주`;
}

// ============================================================================
// 컴포넌트
// ============================================================================

function TrendCard({
  title,
  icon,
  items,
  type,
  previousItems,
}: TrendCardProps) {
  const isVolume = type === "volume";
  const isGainer = type === "gainer";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          데이터를 불러올 수 없습니다
        </p>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {items.map((item) => {
              const rankChange = getRankChange(
                item.ticker,
                item.rank,
                previousItems,
              );

              return (
                <motion.div
                  key={item.ticker}
                  layout
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                  }}
                  className={cn(
                    "flex items-center justify-between py-2 px-2 rounded-lg transition-colors duration-500",
                    rankChange === "up" && "bg-green-50",
                    rankChange === "down" && "bg-red-50",
                    rankChange === "new" && "bg-yellow-50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="size-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                      {item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">{item.ticker}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isVolume ? (
                      <>
                        <p className="text-sm font-medium text-gray-900">
                          {formatVolume(item.volume ?? 0)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            item.changeSign === "up"
                              ? "text-[#F04452]"
                              : item.changeSign === "down"
                                ? "text-[#3182F6]"
                                : "text-gray-500",
                          )}
                        >
                          {item.changeSign === "up" ? "+" : ""}
                          {item.changeRate.toFixed(2)}%
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isGainer ? "text-[#F04452]" : "text-[#3182F6]",
                          )}
                        >
                          {isGainer ? "+" : ""}
                          {item.changeRate.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.price, "KRW")}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        국내 시장 동향
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorState() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        국내 시장 동향
      </h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-gray-500">시장 데이터를 불러올 수 없습니다</p>
      </div>
    </section>
  );
}

export function MarketTrendSection() {
  const { data, isLoading, error } = useDomesticMarketTrend();

  // 이전 데이터를 저장하여 순위 변동 감지
  const prevDataRef = useRef<{
    volumeRank: MarketTrendItem[];
    gainers: MarketTrendItem[];
    losers: MarketTrendItem[];
  }>({
    volumeRank: [],
    gainers: [],
    losers: [],
  });

  // 데이터가 업데이트되면 이전 데이터 저장
  useEffect(() => {
    if (data) {
      // 다음 렌더링 사이클에서 비교를 위해 현재 데이터를 저장
      const timeoutId = setTimeout(() => {
        prevDataRef.current = {
          volumeRank: data.volumeRank,
          gainers: data.gainers,
          losers: data.losers,
        };
      }, 1000); // 애니메이션이 끝난 후 저장

      return () => clearTimeout(timeoutId);
    }
  }, [data]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return <ErrorState />;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        국내 시장 동향
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendCard
          title="거래량 TOP 5"
          icon={<BarChart3 className="size-4 text-indigo-600" />}
          items={data.volumeRank}
          type="volume"
          previousItems={prevDataRef.current.volumeRank}
        />
        <TrendCard
          title="급등주 TOP 5"
          icon={<TrendingUp className="size-4 text-[#F04452]" />}
          items={data.gainers}
          type="gainer"
          previousItems={prevDataRef.current.gainers}
        />
        <TrendCard
          title="급락주 TOP 5"
          icon={<TrendingDown className="size-4 text-[#3182F6]" />}
          items={data.losers}
          type="loser"
          previousItems={prevDataRef.current.losers}
        />
      </div>
    </section>
  );
}
