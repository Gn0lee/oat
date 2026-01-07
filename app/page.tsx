import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 h-14 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="h-full max-w-5xl mx-auto px-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">oat</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            가족 자산,
            <br />
            한눈에 보세요
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto">
            각자 다른 증권사, 다른 종목,
            <br />
            이제 하나로 모아 관리하세요.
          </p>
          <div className="pt-4">
            <Button size="lg" className="text-base px-8" asChild>
              <Link href="/signup">무료로 시작하기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            oat와 함께하면
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="가족 자산 통합"
              description="가족 구성원의 투자 자산을 한 대시보드에서 한눈에 확인하세요."
            />
            <FeatureCard
              title="환율 자동 반영"
              description="해외 주식도 원화로 자동 환산하여 총 자산을 파악할 수 있어요."
            />
            <FeatureCard
              title="포트폴리오 분석"
              description="자산군별, 위험도별 비중을 차트로 확인하고 리밸런싱하세요."
            />
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-500">
          <p>oat - 가족 자산 통합 관리</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
