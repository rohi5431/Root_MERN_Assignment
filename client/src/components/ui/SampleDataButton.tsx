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
      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-violet-200 bg-violet-50 px-3.5 text-sm font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Sparkles aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
