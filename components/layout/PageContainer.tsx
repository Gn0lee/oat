interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "default" | "narrow" | "medium";
}

const maxWidthClasses = {
  default: "max-w-5xl",
  narrow: "max-w-xl",
  medium: "max-w-3xl",
};

export function PageContainer({
  children,
  maxWidth = "default",
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full space-y-6 ${maxWidthClasses[maxWidth]}`}>
      {children}
    </div>
  );
}
