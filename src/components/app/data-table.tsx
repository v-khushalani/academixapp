import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCSV, exportPDF, type Column as ExportColumn } from "@/lib/exporters";

export type DTColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  cell?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  className?: string;
};

type Props<T extends { id: string | number }> = {
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

export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  searchKeys,
  searchPlaceholder = "Search…",
  pageSize = 10,
  toolbar,
  exportName = "export",
  exportTitle = "Export",
  emptyMessage = "No records match your filters.",
  loading,
  onRowClick,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const term = q.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return rows.filter((r) =>
      keys.some((k) => {
        const v = (r as Record<string, unknown>)[k as string];
        return v != null && String(v).toLowerCase().includes(term);
      }),
    );
  }, [rows, q, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = col?.value ? col.value(a) : (a as Record<string, unknown>)[sort.key];
      const bv = col?.value ? col.value(b) : (b as Record<string, unknown>)[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCols: ExportColumn<T>[] = columns.map((c) => ({
    key: c.key,
    label: c.header,
    get: (r) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]),
  }));

  function toggleSort(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[180px] flex-1 sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-9"
          />
        </div>
        {toolbar}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCSV(exportName, sorted, exportCols)}>
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportPDF(exportName, exportTitle, sorted, exportCols)}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : pageRows.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          pageRows.map((r) => (
            <div
              key={r.id}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`rounded-lg border border-border bg-card p-3 ${onRowClick ? "active:bg-muted/40" : ""}`}
            >
              <div className="text-sm font-medium text-foreground">
                {columns[0].cell
                  ? columns[0].cell(r)
                  : ((r as Record<string, unknown>)[columns[0].key] as ReactNode)}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {columns.slice(1).map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.header}
                    </dt>
                    <dd className="truncate text-sm">
                      {c.cell ? c.cell(r) : ((r as Record<string, unknown>)[c.key] as ReactNode)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-muted-foreground">
          <span>
            {sorted.length} record{sorted.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>
              {currentPage}/{pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.header}
                        {sort?.key !== c.key && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        {sort?.key === c.key && sort.dir === "asc" && (
                          <ArrowUp className="h-3 w-3" />
                        )}
                        {sort?.key === c.key && sort.dir === "desc" && (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    className={
                      onRowClick ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/30"
                    }
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                        {c.cell ? c.cell(r) : ((r as Record<string, unknown>)[c.key] as ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            {sorted.length === 0
              ? "0"
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sorted.length)}`}{" "}
            of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
