"use client";

import { icons, Tag } from "lucide-react";

interface CategoryIconProps {
  /** Lucide 아이콘명 (PascalCase). null이면 기본 아이콘(Tag) 표시 */
  iconName: string | null;
  className?: string;
}

/**
 * Lucide 아이콘명 문자열을 받아 동적으로 렌더링하는 컴포넌트.
 * DB categories.icon 컬럼 값을 그대로 전달하면 됩니다.
 */
export function CategoryIcon({ iconName, className }: CategoryIconProps) {
  const Icon = iconName
    ? (icons[iconName as keyof typeof icons] ?? null)
    : null;

  return Icon ? <Icon className={className} /> : <Tag className={className} />;
}
