import { formatCurrency, formatDateShort } from "@/lib/utils/format";

interface ExchangeRateInfoProps {
  rate: number;
  updatedAt: string | null;
}

export function ExchangeRateInfo({ rate, updatedAt }: ExchangeRateInfoProps) {
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
