import { Sparkles } from 'lucide-react';

interface SampleDataButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function SampleDataButton({
  label,
  onClick,
  disabled = false,
}: SampleDataButtonProps) {
  return (
    <button
      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-blue-200 bg-blue-50 px-3.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Sparkles aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
