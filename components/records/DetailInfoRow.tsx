interface DetailInfoRowProps {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}

export function DetailInfoRow({
  label,
  value,
  multiline = false,
}: DetailInfoRowProps) {
  if (multiline) {
    return (
      <div className="border-gray-100 border-b px-4 py-3 sm:px-5 last:border-b-0">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-gray-500">{label}</span>
          <div className="min-w-0 text-sm font-medium text-gray-900 whitespace-pre-wrap break-words leading-6">
            {value}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 border-gray-100 border-b px-4 py-3 sm:px-5 last:border-b-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}
