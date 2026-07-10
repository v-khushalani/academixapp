/**
 * Data table types and utilities
 * Extracted from data-table.tsx to separate component concerns
 */

import type { ReactNode } from "react";
import type { Column as ExportColumn } from "@/lib/exporters";

export type DTColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  cell?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  className?: string;
};

export type DTProps<T extends { id: string | number }> = {
  rows: T[];
  columns: DTColumn<T>[];
  searchKeys?: (keyof T | string)[];
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  exportName?: string;
  exportTitle?: string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
};

export type SortState = { key: string; dir: "asc" | "desc" } | null;

/**
 * Filter rows by search query
 */
export function filterRows<T extends { id: string | number }>(
  rows: T[],
  query: string,
  searchKeys: (keyof T | string)[] | undefined,
  columns: DTColumn<T>[],
): T[] {
  if (!query) return rows;

  const term = query.toLowerCase();
  const keys = searchKeys ?? columns.map((c) => c.key);

  return rows.filter((r) =>
    keys.some((k) => {
      const v = (r as Record<string, unknown>)[k as string];
      return v != null && String(v).toLowerCase().includes(term);
    }),
  );
}

/**
 * Sort rows by column
 */
export function sortRows<T extends { id: string | number }>(
  rows: T[],
  sortState: SortState,
  columns: DTColumn<T>[],
): T[] {
  if (!sortState) return rows;

  const col = columns.find((c) => c.key === sortState.key);
  const arr = [...rows];

  arr.sort((a, b) => {
    const av = col?.value ? col.value(a) : (a as Record<string, unknown>)[sortState.key];
    const bv = col?.value ? col.value(b) : (b as Record<string, unknown>)[sortState.key];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (typeof av === "number" && typeof bv === "number") {
      return sortState.dir === "asc" ? av - bv : bv - av;
    }

    return sortState.dir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  return arr;
}

/**
 * Get export columns from data table columns
 */
export function getExportColumns<T extends { id: string | number }>(
  columns: DTColumn<T>[],
): ExportColumn<T>[] {
  return columns.map((c) => ({
    key: c.key,
    label: c.header,
    get: (r) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]),
  }));
}

/**
 * Paginate rows
 */
export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { rows: T[]; pageCount: number; currentPage: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { rows: pageRows, pageCount, currentPage };
}
