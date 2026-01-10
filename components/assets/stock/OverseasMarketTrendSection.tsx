"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Newspaper, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  useOverseasMarketTrend,
  useOverseasNews,
} from "@/hooks/use-market-trend";
import { cn } from "@/lib/utils/cn";
import type { MarketTrendItem, OverseasNewsItem } from "@/types";

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

interface NewsCardProps {
  items: OverseasNewsItem[];
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
 * USD 가격 포맷팅
 */
function formatUSDPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * 거래량 포맷팅 (해외: 주 단위)
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toLocaleString();
}

/**
 * 상대 시간 포맷팅
 */
function formatRelativeTime(datetime: string): string {
  const date = new Date(datetime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}분 전`;
  }
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }
  return `${diffDays}일 전`;
}

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 해외 시장 동향 카드 (급등/급락/거래량급증)
 */
function getEmptyMessage(type: "volume" | "gainer" | "loser"): string {
  switch (type) {
    case "gainer":
      return "오늘은 급등주가 없어요";
    case "loser":
      return "오늘은 급락주가 없어요";
    case "volume":
      return "오늘은 거래량 급증 종목이 없어요";
  }
}

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
          {getEmptyMessage(type)}
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
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
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
                          {formatUSDPrice(item.price)}
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

/**
 * 해외 뉴스 카드
 */
function NewsCard({ items }: NewsCardProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="size-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">종합뉴스</h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          아직 새로운 뉴스가 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="size-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">종합뉴스</h3>
      </div>
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.newsKey}
            className="py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-900 line-clamp-2 flex-1">
                {item.title}
              </p>
              {item.ticker && (
                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                  {item.ticker}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {item.source} · {formatRelativeTime(item.datetime)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function LoadingSkeleton() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        해외 시장 동향
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
      <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 에러 상태
 */
function ErrorState() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        해외 시장 동향
      </h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-gray-500">해외 시장 데이터를 불러올 수 없습니다</p>
      </div>
    </section>
  );
}

/**
 * 해외 시장 동향 섹션 메인 컴포넌트
 */
export function OverseasMarketTrendSection() {
  const {
    data: trendData,
    isLoading: isTrendLoading,
    error: trendError,
  } = useOverseasMarketTrend();
  const { data: newsData, isLoading: isNewsLoading } = useOverseasNews();

  // 이전 데이터를 저장하여 순위 변동 감지
  const prevDataRef = useRef<{
    volumeSurge: MarketTrendItem[];
    gainers: MarketTrendItem[];
    losers: MarketTrendItem[];
  }>({
    volumeSurge: [],
    gainers: [],
    losers: [],
  });

  // 데이터가 업데이트되면 이전 데이터 저장
  useEffect(() => {
    if (trendData) {
      const timeoutId = setTimeout(() => {
        prevDataRef.current = {
          volumeSurge: trendData.volumeSurge,
          gainers: trendData.gainers,
          losers: trendData.losers,
        };
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [trendData]);

  // 로딩 중
  if (isTrendLoading) {
    return <LoadingSkeleton />;
  }

  // 에러 또는 데이터 없음
  if (trendError || !trendData) {
    return <ErrorState />;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        해외 시장 동향
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrendCard
          title="급등주 TOP 5"
          icon={<TrendingUp className="size-4 text-[#F04452]" />}
          items={trendData.gainers}
          type="gainer"
          previousItems={prevDataRef.current.gainers}
        />
        <TrendCard
          title="급락주 TOP 5"
          icon={<TrendingDown className="size-4 text-[#3182F6]" />}
          items={trendData.losers}
          type="loser"
          previousItems={prevDataRef.current.losers}
        />
        <TrendCard
          title="거래량 급증 TOP 5"
          icon={<BarChart3 className="size-4 text-indigo-600" />}
          items={trendData.volumeSurge}
          type="volume"
          previousItems={prevDataRef.current.volumeSurge}
        />
      </div>
      {!isNewsLoading && newsData && (
        <div className="mt-4">
          <NewsCard items={newsData.news} />
        </div>
      )}
    </section>
  );
}
