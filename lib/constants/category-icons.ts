/**
 * 가계부 카테고리용 큐레이션된 Lucide 아이콘 목록
 *
 * - DB에는 아이콘명 문자열(예: 'utensils')만 저장
 * - UI에서 lucide-react의 icons 객체로 동적 렌더링
 * - 아이콘 추가/제거 시 이 파일만 수정하면 됨
 */

export interface IconGroup {
  label: string;
  icons: string[];
}

/**
 * 아이콘 피커에서 그룹별로 표시할 아이콘 목록.
 * 각 아이콘명은 lucide-react의 icons 객체 키와 일치해야 합니다.
 */
export const CURATED_ICON_GROUPS: IconGroup[] = [
  {
    label: "음식",
    icons: [
      "Utensils",
      "Coffee",
      "Wine",
      "Pizza",
      "Apple",
      "Beer",
      "CupSoda",
      "Egg",
      "IceCreamCone",
      "Sandwich",
    ],
  },
  {
    label: "생활",
    icons: [
      "House",
      "Sofa",
      "Lamp",
      "Wrench",
      "Shirt",
      "Droplets",
      "Sparkles",
      "Bath",
      "Baby",
      "Dog",
    ],
  },
  {
    label: "교통",
    icons: [
      "Car",
      "Bus",
      "TrainFront",
      "Plane",
      "Fuel",
      "Bike",
      "Navigation",
      "CircleParking",
    ],
  },
  {
    label: "금융",
    icons: [
      "PiggyBank",
      "Wallet",
      "CreditCard",
      "TrendingUp",
      "Banknote",
      "CircleDollarSign",
      "Receipt",
      "Calculator",
    ],
  },
  {
    label: "건강/의료",
    icons: ["Stethoscope", "Heart", "Pill", "Activity", "Dumbbell", "Shield"],
  },
  {
    label: "교육/업무",
    icons: [
      "BookOpen",
      "GraduationCap",
      "Briefcase",
      "Laptop",
      "Pen",
      "School",
    ],
  },
  {
    label: "여가/문화",
    icons: [
      "Clapperboard",
      "Music",
      "Gamepad2",
      "Camera",
      "Palette",
      "Ticket",
      "MapPin",
      "Compass",
    ],
  },
  {
    label: "쇼핑",
    icons: ["ShoppingCart", "ShoppingBag", "Gift", "Package", "Tag", "Store"],
  },
  {
    label: "기타",
    icons: [
      "Zap",
      "Phone",
      "Wifi",
      "Globe",
      "Repeat",
      "RotateCcw",
      "HeartHandshake",
      "CircleQuestionMark",
    ],
  },
];

/**
 * 전체 큐레이션 아이콘 이름 목록 (flat 배열).
 * 검증 및 아이콘 존재 확인에 사용합니다.
 */
export const CURATED_ICON_NAMES: string[] = CURATED_ICON_GROUPS.flatMap(
  (group) => group.icons,
);
