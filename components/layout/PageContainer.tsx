interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "default" | "narrow" | "medium";
}

const maxWidthClasses = {
  default: "",
  narrow: "max-w-lg mx-auto",
  medium: "max-w-2xl mx-auto",
};

export function PageContainer({
  children,
  maxWidth = "default",
}: PageContainerProps) {
  if (maxWidth === "default") {
    return <>{children}</>;
  }

  return (
    <div className={`${maxWidthClasses[maxWidth]} space-y-6`}>{children}</div>
  );
}
