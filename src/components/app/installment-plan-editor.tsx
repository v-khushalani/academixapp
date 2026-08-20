import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Installment } from "@/lib/installments";
import { planTotal } from "@/lib/installments";

export function InstallmentPlanEditor({
  plan,
  onChange,
}: {
  plan: Installment[];
  onChange: (p: Installment[]) => void;
}) {
  const total = planTotal(plan);

  function patch(i: number, p: Partial<Installment>) {
    onChange(plan.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  }

  return (
    <div className="space-y-2">
      {plan.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_5rem_9rem_5rem_2rem]"
        >
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Name</Label>
            <Input
              className="h-8"
              value={row.label}
              onChange={(e) => patch(i, { label: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Share %</Label>
            <Input
              className="h-8 tabular-nums"
              type="number"
              min={0}
              max={100}
              value={row.share}
              onChange={(e) => patch(i, { share: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Counted from</Label>
            <Select
              value={row.basis}
              onValueChange={(v) => patch(i, { basis: v as Installment["basis"] })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">Admission date</SelectItem>
                <SelectItem value="batch_start">Batch start date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">In days</Label>
            <Input
              className="h-8 tabular-nums"
              type="number"
              min={0}
              value={row.days}
              onChange={(e) => patch(i, { days: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end justify-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              disabled={plan.length <= 1}
              onClick={() => onChange(plan.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            onChange([
              ...plan,
              {
                label: `Installment ${plan.length + 1}`,
                share: 0,
                basis: "batch_start",
                days: 90 * plan.length,
              },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add installment
        </Button>
        <p className={total === 100 ? "text-xs text-muted-foreground" : "text-xs text-warning"}>
          Total share {total}% {total === 100 ? "" : "— should add up to 100%"}
        </p>
      </div>
    </div>
  );
}