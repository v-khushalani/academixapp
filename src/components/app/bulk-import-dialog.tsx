import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  transform?: (raw: string) => unknown;
};

/** Generic CSV importer: download a template, upload a filled CSV, preview, then commit. */
export function BulkImportDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  templateName,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  fields: ImportField[];
  templateName: string;
  onImport: (rows: T[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const csv = Papa.unparse([Object.fromEntries(fields.map((f) => [f.label, ""]))]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${templateName}-template.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function parse(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const errs: string[] = [];
        const out: T[] = [];
        res.data.forEach((raw, i) => {
          const rec: Record<string, unknown> = {};
          for (const f of fields) {
            const v = (raw[f.label] ?? raw[f.key] ?? "").toString().trim();
            if (!v) {
              if (f.required) errs.push(`Row ${i + 2}: "${f.label}" is required`);
              continue;
            }
            rec[f.key] = f.transform ? f.transform(v) : v;
          }
          if (Object.keys(rec).length) out.push(rec as T);
        });
        setErrors(errs);
        setRows(out);
        toast.success(`${out.length} rows read from file`);
      },
      error: () => toast.error("Could not read that CSV"),
    });
  }

  async function commit() {
    setBusy(true);
    try {
      await onImport(rows);
      toast.success(`Imported ${rows.length} rows`);
      setRows([]);
      setErrors([]);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Download template
            </Button>
            <Input
              type="file"
              accept=".csv,text/csv"
              className="h-9 max-w-full sm:w-[260px]"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parse(f);
              }}
            />
          </div>

          {errors.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {errors.slice(0, 20).map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          {preview.length > 0 && (
            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {fields.map((f) => (
                      <th key={f.key} className="px-2 py-1.5 text-left font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {fields.map((f) => (
                        <td key={f.key} className="px-2 py-1.5">
                          {String(r[f.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rows.length ? `${rows.length} rows ready` : "No file selected yet"}
            </p>
            <Button
              disabled={rows.length === 0 || errors.length > 0 || busy}
              className="gap-1.5"
              onClick={commit}
            >
              <Upload className="h-4 w-4" /> Import {rows.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
