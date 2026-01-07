"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_TYPE_LABELS,
  MARKET_LABELS,
  RISK_LEVEL_OPTIONS,
} from "@/constants/enums";
import { useUpdateStockSetting } from "@/hooks/use-stock-settings";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";
import {
  type UpdateStockSettingInput,
  updateStockSettingSchema,
} from "@/schemas/stock-setting";

interface StockSettingEditDialogProps {
  setting: StockSettingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockSettingEditDialog({
  setting,
  open,
  onOpenChange,
}: StockSettingEditDialogProps) {
  const updateMutation = useUpdateStockSetting();

  const {
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UpdateStockSettingInput>({
    resolver: zodResolver(updateStockSettingSchema),
    defaultValues: {
      riskLevel: null,
    },
  });

  const watchRiskLevel = watch("riskLevel");

  // setting이 변경될 때 폼 값 초기화
  useEffect(() => {
    if (setting) {
      reset({
        riskLevel: setting.riskLevel,
      });
    }
  }, [setting, reset]);

  const onSubmit = async (data: UpdateStockSettingInput) => {
    if (!setting) return;

    try {
      await updateMutation.mutateAsync({
        id: setting.id,
        data,
      });
      toast.success("종목 설정이 수정되었습니다.");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("종목 설정 수정에 실패했습니다.");
      }
    }
  };

  if (!setting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>종목 설정 수정</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{setting.name}</span>
            <span className="ml-2 text-muted-foreground">
              ({setting.ticker})
            </span>
            <Badge variant="outline" className="ml-2">
              {MARKET_LABELS[setting.market]}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 자산유형 (정보 표시) */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">자산유형</span>
            <span className="text-sm font-medium">
              {ASSET_TYPE_LABELS[setting.assetType]}
            </span>
          </div>

          {/* 위험도 선택 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="riskLevel" className="text-muted-foreground">
              위험도
            </Label>
            <Select
              value={watchRiskLevel ?? "none"}
              onValueChange={(value) =>
                setValue(
                  "riskLevel",
                  value === "none"
                    ? null
                    : (value as NonNullable<
                        UpdateStockSettingInput["riskLevel"]
                      >),
                )
              }
            >
              <SelectTrigger id="riskLevel" className="w-[120px]">
                <SelectValue placeholder="위험도 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">미설정</SelectItem>
                {RISK_LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
