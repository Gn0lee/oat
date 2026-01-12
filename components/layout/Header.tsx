import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200">
      <div className="h-full px-4 py-3.5 flex items-center">
        {/* 로고 */}
        <Link href="/home" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">oat</span>
        </Link>
      </div>
    </header>
  );
}
