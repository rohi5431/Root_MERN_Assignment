import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const buttonClass =
    'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-primary-text transition hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45';

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-secondary-text">
        Showing <span className="font-medium text-primary-text">{firstItem}</span> to{' '}
        <span className="font-medium text-primary-text">{lastItem}</span> of{' '}
        <span className="font-medium text-primary-text">{totalItems}</span>
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        <button
          className={buttonClass}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span>Previous</span>
        </button>
        <span className="px-1 text-sm text-secondary-text" aria-live="polite">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <button
          className={buttonClass}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          <span>Next</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </nav>
    </div>
  );
}
