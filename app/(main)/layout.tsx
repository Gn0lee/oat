import { BottomNav, Header, Sidebar } from "@/components/layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
          <div className="max-w-4xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
