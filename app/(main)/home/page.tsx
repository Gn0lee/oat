import { HomePageClient } from "@/components/home";
import { PageHeader } from "@/components/layout";

export default function HomePage() {
  return (
    <>
      <PageHeader title="홈" />
      <HomePageClient />
    </>
  );
}
