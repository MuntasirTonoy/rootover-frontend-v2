import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

// Client-side page slicing used by the dashboard tables
export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  return {
    pageItems: items.slice((current - 1) * pageSize, current * pageSize),
    totalPages,
    currentPage: current,
  };
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

// Shows every page up to 7, otherwise 1 … neighbours of current … last
function generatePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const p: (number | "...")[] = [1];
  if (currentPage > 3) p.push("...");
  if (currentPage > 2) p.push(currentPage - 1);
  if (currentPage !== 1 && currentPage !== totalPages) p.push(currentPage);
  if (currentPage < totalPages - 1) p.push(currentPage + 1);
  if (currentPage < totalPages - 2) p.push("...");
  p.push(totalPages);
  return p;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageList = generatePages(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {pageList.map((page, index) => (
        <button
          key={`${page}-${index}`}
          onClick={() => typeof page === "number" && onPageChange(page)}
          disabled={page === "..." || isLoading}
          className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            page === currentPage
              ? "bg-primary text-primary-foreground shadow-md"
              : page === "..."
                ? "cursor-default text-muted-foreground"
                : "border border-border hover:bg-muted text-foreground"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next Page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
