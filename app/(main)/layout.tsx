import { BottomNav, Header, Sidebar } from "@/components/layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 pb-20 lg:pb-4">
          <div className="max-w-4xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
