import type { ReactNode } from "react";
import { Button } from "./Button";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyTitle?: string;
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  getRowKey: (row: T) => string | number;
}

export function DataTable<T>({
  rows,
  columns,
  loading,
  emptyTitle = "No records found",
  page,
  totalPages,
  totalElements,
  onPageChange,
  getRowKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-moss/10 bg-white/80">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-moss/10">
          <thead className="bg-moss/5">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-[0.16em] text-ink/55"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-moss/10">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.header} className="px-5 py-4">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-moss/10" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              rows.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-fern/5">
                  {columns.map((column) => (
                    <td key={column.header} className={column.className ?? "px-5 py-4 text-sm text-ink/75"}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-ink">{emptyTitle}</p>
          <p className="mt-1 text-sm text-ink/55">Try changing the search or filters.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-moss/10 px-5 py-4 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages} - {totalElements} records
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={totalPages === 0 || page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
