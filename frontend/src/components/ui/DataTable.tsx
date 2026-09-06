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
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] divide-y divide-line">
          <thead className="bg-moss/5">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-ink/55 sm:px-5"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.header} className="px-4 py-3.5 sm:px-5">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-moss/10" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              rows.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-fern/5">
                  {columns.map((column) => (
                    <td key={column.header} className={column.className ?? "px-4 py-3.5 text-sm text-ink/75 sm:px-5"}>
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

      <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="text-xs font-semibold sm:text-sm">
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages} · {totalElements} records
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-initial"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-initial"
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
