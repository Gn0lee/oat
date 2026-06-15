import { cn } from "@/lib/utils/cn";

export function GroupedList({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100",
        className,
      )}
      {...props}
    />
  );
}
