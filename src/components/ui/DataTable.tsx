"use client";

import { useState, type ReactNode } from "react";
import Pagination, { paginate } from "@/components/dashboard/Pagination";
import { EmptyBlock } from "./primitives";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

// Scrolls horizontally on small screens instead of collapsing into cards
export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  pageSize = 10,
  emptyTitle = "Nothing to show",
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const { pageItems, totalPages, currentPage } = paginate(rows, page, pageSize);

  if (rows.length === 0) {
    return <EmptyBlock title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.header} scope="col" className={`px-4 py-3 font-semibold ${col.className ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {pageItems.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer hover:bg-surface/60" : "hover:bg-surface/40"}
              >
                {columns.map((col) => (
                  <td key={col.header} className={`px-4 py-3 align-middle ${col.className ?? ""}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="mt-8 text-xs text-muted-foreground hidden sm:block">
          {rows.length} record{rows.length === 1 ? "" : "s"}
        </p>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
