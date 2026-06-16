"use client";

import { Pencil, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { GroupedList, ScreenState } from "@/components/layout/screen";
import { StockSettingEditDialog } from "@/components/stock-settings/StockSettingEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ASSET_TYPE_LABELS,
  MARKET_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
} from "@/constants/enums";
import type { StockSettingWithDetails } from "@/lib/api/stock-settings";

interface StockSettingsTableProps {
  data: StockSettingWithDetails[];
}

function sortSettings(
  settings: StockSettingWithDetails[],
): StockSettingWithDetails[] {
  return [...settings].sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}

export function StockSettingsTable({ data }: StockSettingsTableProps) {
  const [selectedSetting, setSelectedSetting] =
    useState<StockSettingWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sortedSettings = useMemo(() => sortSettings(data), [data]);

  const handleEdit = (setting: StockSettingWithDetails) => {
    setSelectedSetting(setting);
    setDialogOpen(true);
  };

  return (
    <>
      {sortedSettings.length > 0 ? (
        <GroupedList>
          {sortedSettings.map((setting) => {
            const riskLabel = setting.riskLevel
              ? (RISK_LEVEL_LABELS[setting.riskLevel] ?? setting.riskLevel)
              : "미설정";

            return (
              <article
                key={setting.id}
                className="flex min-h-[84px] items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Settings2 className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-gray-900">
                      {setting.name}
                    </h3>
                    <span className="text-gray-400 text-xs">
                      {setting.ticker}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {MARKET_LABELS[setting.market] ?? setting.market}
                    </Badge>
                    <Badge variant="outline">
                      {ASSET_TYPE_LABELS[setting.assetType] ??
                        setting.assetType}
                    </Badge>
                    {setting.riskLevel ? (
                      <Badge
                        variant="secondary"
                        className={RISK_LEVEL_COLORS[setting.riskLevel] ?? ""}
                      >
                        {riskLabel}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        {riskLabel}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(setting)}
                  className="size-10 shrink-0"
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">수정</span>
                </Button>
              </article>
            );
          })}
        </GroupedList>
      ) : (
        <ScreenState
          type="empty"
          title="등록된 종목이 없습니다."
          description="첫 거래를 등록하면 종목 설정이 자동으로 만들어집니다."
        />
      )}

      <StockSettingEditDialog
        setting={selectedSetting}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
