import {
  BottomNav,
  PageTransition,
  PageTransitionProvider,
  ServiceHeader,
  Sidebar,
} from "@/components/layout";

import { isMcpEnabled } from "@/lib/mcp/feature-flags";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mcpEnabled = isMcpEnabled();
  return (
    <div className="h-dvh flex bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative">
        <ServiceHeader variant="desktop" mcpEnabled={mcpEnabled} />
        <ServiceHeader variant="mobile" mcpEnabled={mcpEnabled} />
        <div className="size-full overflow-y-scroll overflow-x-clip relative z-0">
          <PageTransitionProvider>
            <PageTransition className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-14 lg:pb-4 lg:pt-0">
              <div className="px-4 py-4 sm:px-6 lg:px-8">{children}</div>
            </PageTransition>
          </PageTransitionProvider>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
