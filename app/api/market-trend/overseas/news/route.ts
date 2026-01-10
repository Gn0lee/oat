import { NextResponse } from "next/server";
import { APIError, toErrorResponse } from "@/lib/api/error";
import { getOverseasNews } from "@/lib/kis/client";
import type { KISOverseasNewsOutput } from "@/lib/kis/types";
import type { OverseasNewsData, OverseasNewsItem } from "@/types";

/**
 * 뉴스 응답을 OverseasNewsItem으로 변환
 */
function mapNews(item: KISOverseasNewsOutput): OverseasNewsItem {
  // 날짜/시간 포맷팅: YYYYMMDD + HHMMSS -> ISO8601
  const date = item.data_dt;
  const time = item.data_tm;
  const datetime =
    date && time
      ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`
      : new Date().toISOString();

  return {
    newsKey: item.news_key,
    title: item.title,
    source: item.source,
    datetime,
    ticker: item.symb || undefined,
    tickerName: item.symb_name || undefined,
  };
}

/**
 * 해외뉴스 조회
 * GET /api/market-trend/overseas/news
 *
 * 인증 불필요 (공개 데이터)
 * 5분 캐싱 (Cache-Control 헤더)
 */
export async function GET() {
  try {
    const news = await getOverseasNews(10);

    const result: OverseasNewsData = {
      news: news.map(mapNews),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("해외뉴스 조회 실패:", error);

    if (error instanceof APIError) {
      return NextResponse.json(toErrorResponse(error), {
        status: error.statusCode,
      });
    }

    return NextResponse.json(
      toErrorResponse(
        new APIError(
          "OVERSEAS_NEWS_ERROR",
          "해외뉴스 조회에 실패했습니다.",
          500,
        ),
      ),
      { status: 500 },
    );
  }
}
