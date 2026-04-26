import { icons } from "lucide-react";
import { describe, expect, it } from "vitest";
import { CURATED_ICON_GROUPS, CURATED_ICON_NAMES } from "./category-icons";

describe("CURATED_ICON_GROUPS", () => {
  it("모든 아이콘명이 lucide-react에 존재한다", () => {
    const lucideIconNames = new Set(Object.keys(icons));

    for (const group of CURATED_ICON_GROUPS) {
      for (const iconName of group.icons) {
        expect(
          lucideIconNames.has(iconName),
          `아이콘 "${iconName}" (그룹: ${group.label})이 lucide-react에 존재하지 않습니다.`,
        ).toBe(true);
      }
    }
  });

  it("그룹 간 중복 아이콘이 없다", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const group of CURATED_ICON_GROUPS) {
      for (const iconName of group.icons) {
        if (seen.has(iconName)) {
          duplicates.push(iconName);
        }
        seen.add(iconName);
      }
    }

    expect(duplicates, `중복 아이콘: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("각 그룹에 최소 1개 이상의 아이콘이 있다", () => {
    for (const group of CURATED_ICON_GROUPS) {
      expect(
        group.icons.length,
        `그룹 "${group.label}"에 아이콘이 없습니다.`,
      ).toBeGreaterThan(0);
    }
  });

  it("각 그룹에 label이 있다", () => {
    for (const group of CURATED_ICON_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
    }
  });
});

describe("CURATED_ICON_NAMES", () => {
  it("CURATED_ICON_GROUPS의 모든 아이콘을 포함한다", () => {
    const expectedCount = CURATED_ICON_GROUPS.reduce(
      (sum, group) => sum + group.icons.length,
      0,
    );
    expect(CURATED_ICON_NAMES).toHaveLength(expectedCount);
  });

  it("빈 배열이 아니다", () => {
    expect(CURATED_ICON_NAMES.length).toBeGreaterThan(0);
  });
});
