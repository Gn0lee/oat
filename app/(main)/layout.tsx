import { BottomNav, Header, Sidebar } from "@/components/layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="size-full overflow-y-scroll">
          <main className="flex-1 p-4 pb-20 lg:pb-4 ">
            <div className="max-w-4xl mx-auto space-y-6">{children}</div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
