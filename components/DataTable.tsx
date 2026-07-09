"use client";

import React, { useState } from "react";
import { IconSearch, IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: keyof T | ((item: T) => string | number);
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No records found.",
  searchPlaceholder,
  searchFilter,
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  let processedData =
    searchPlaceholder && searchFilter && searchQuery
      ? data.filter((item) => searchFilter(item, searchQuery))
      : [...data];

  if (sortCol !== null && columns[sortCol]?.sortKey) {
    const col = columns[sortCol];
    processedData = [...processedData].sort((a, b) => {
      const key = col.sortKey!;
      const aVal = typeof key === "function" ? key(a) : (a as Record<string, unknown>)[key as string];
      const bVal = typeof key === "function" ? key(b) : (b as Record<string, unknown>)[key as string];
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (idx: number) => {
    if (!columns[idx].sortable) return;
    if (sortCol === idx) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  };

  return (
    <div className="border border-bd-t rounded-lg overflow-hidden bg-bg-p shadow-card">
      {searchPlaceholder && searchFilter && (
        <div className="flex items-center px-4 py-3 border-b border-bd-t bg-bg-s/50">
          <IconSearch className="w-4 h-4 text-tx-t mr-3 shrink-0" aria-hidden />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 w-full text-tx-p placeholder-tx-t font-medium"
            aria-label="Search table"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-s border-b border-bd-t">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-4 py-3.5 text-xs font-semibold text-tx-s uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-tx-p transition-colors",
                    col.className
                  )}
                  onClick={() => handleSort(idx)}
                  aria-sort={sortCol === idx ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortCol === idx ? (
                        sortDir === "asc" ? (
                          <IconChevronUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <IconChevronDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <IconSelector className="w-3.5 h-3.5 text-tx-t opacity-50" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-b border-bd-t last:border-none text-sm text-tx-s transition-colors",
                    "hover:bg-teal-bg/30",
                    rowIdx % 2 === 1 && "bg-bg-s/40"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={cn("px-4 py-3.5", col.className)}>
                      {col.render(item, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-tx-t font-medium">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {processedData.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-bd-t bg-bg-s/50">
          <p className="text-xs text-tx-s font-medium">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-bd-t text-tx-s hover:bg-bg-t disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-1 text-tx-t text-xs">…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 text-xs font-semibold rounded-md transition-colors",
                      currentPage === page
                        ? "bg-primary text-white"
                        : "text-tx-s hover:bg-bg-t border border-bd-t"
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-bd-t text-tx-s hover:bg-bg-t disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
