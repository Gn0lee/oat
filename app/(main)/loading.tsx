import { Skeleton } from "@/components/ui/skeleton";

export default function MainLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32 bg-gray-200" />
        <Skeleton className="h-4 w-48 bg-gray-200" />
      </div>
      <Skeleton className="h-36 rounded-2xl bg-gray-200" />
      <Skeleton className="h-36 rounded-2xl bg-gray-200" />
      <Skeleton className="h-28 rounded-2xl bg-gray-200" />
    </div>
  );
}
