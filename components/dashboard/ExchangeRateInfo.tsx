import { formatCurrency, formatDateShort } from "@/lib/utils/format";

interface ExchangeRateInfoProps {
  rate: number | null;
  updatedAt: string | null;
}

export function ExchangeRateInfo({ rate, updatedAt }: ExchangeRateInfoProps) {
  if (rate === null) {
    return (
      <div className="text-center text-xs text-gray-500">
        <p>환율 정보를 불러올 수 없습니다. 관리자에게 문의하세요.</p>
      </div>
    );
  }

  const formattedRate = formatCurrency(rate, "KRW");
  const formattedDate = updatedAt ? formatDateShort(updatedAt) : null;

  return (
    <div className="text-center text-xs text-gray-500 space-y-1">
      <p>
        현재 적용 환율:{" "}
        <span className="font-medium">1 USD = {formattedRate}</span>
      </p>
      {formattedDate && <p>{formattedDate} 기준</p>}
    </div>
  );
}
