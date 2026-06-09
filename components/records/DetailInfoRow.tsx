interface DetailInfoRowProps {
  label: string;
  value: React.ReactNode;
}

export function DetailInfoRow({ label, value }: DetailInfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-gray-100 border-b py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}
