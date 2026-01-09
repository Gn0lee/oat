import { HelpCircle, Wallet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils/format";

interface TotalAssetCardProps {
  totalValue: number;
  totalInvested: number;
  isLoading?: boolean;
}

export function TotalAssetCard({
  totalValue,
  totalInvested,
  isLoading,
}: TotalAssetCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-9 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">총 자산</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
              >
                <HelpCircle className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>보유 중인 모든 자산의 현재 가치예요</p>
              <p className="text-xs text-gray-400 mt-1.5">
                평가금액 = 보유수량 × 현재가
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="p-1.5 rounded-full bg-gray-100">
          <Wallet className="size-4 text-gray-500" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">
        {formatCurrency(totalValue, "KRW")}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        무려 {formatCurrency(totalInvested, "KRW")}이나 투자했어요
      </p>
    </div>
  );
}
