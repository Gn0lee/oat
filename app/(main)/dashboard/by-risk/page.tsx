import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ByRiskAnalysisPage() {
  return (
    <>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">위험도별 분석</h1>
          <p className="text-sm text-gray-500">안전/중립/공격 자산 비중</p>
        </div>
      </div>

      {/* 준비 중 메시지 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <p className="text-gray-500 mb-2">위험도별 분석 기능을 준비 중이에요</p>
        <p className="text-sm text-gray-400">
          종목별 위험도 설정 후 비중을 분석할 수 있어요
        </p>
      </div>
    </>
  );
}
