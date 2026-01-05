import { redirect } from "next/navigation";

// /transactions 접근 시 /transactions/new로 리다이렉트
// 추후 거래 내역 목록 또는 온보딩 페이지로 변경 예정
export default function TransactionsPage() {
  redirect("/transactions/new");
}
