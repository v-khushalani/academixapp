import { createFileRoute } from "@tanstack/react-router";
import { inr } from "@/lib/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IndianRupee, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, type DTColumn } from "@/components/app/data-table";
import { expensesApi, facultyApi } from "@/lib/api";

export const Route = createFileRoute("/app/expenses")({
  component: ExpensesPage,
});

const CATEGORIES = ["Salary", "Rent", "Electricity", "Marketing", "Stationery", "Internet", "Water", "Taxes", "Maintenance", "Others"];
const METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"];

function ExpensesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.list(),
  });

  const { data: faculty = [] } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success("Expense removed");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: DTColumn<any>[] = [
    { key: "date", header: "Date", sortable: true, value: (r) => r.date },
    { key: "category", header: "Category", sortable: true, value: (r) => r.category },
    { 
      key: "description", 
      header: "Description", 
      value: (r) => r.description ?? "",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.description || r.category}</p>
          {r.faculty && <p className="text-xs text-muted-foreground">Paid to: {r.faculty.full_name}</p>}
        </div>
      )
    },
    { key: "payment_method", header: "Method", value: (r) => r.payment_method ?? "" },
    { 
      key: "amount", 
      header: "Amount", 
      sortable: true, 
      className: "text-right",
      value: (r) => r.amount,
      cell: (r) => <span className="font-semibold text-destructive">{inr(r.amount)}</span> 
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (r) => (
        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track your academy overheads and faculty pay."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-1.5"
              onClick={async () => {
                const ok = confirm("Process all active faculty salaries for this month as expenses?");
                if (!ok) return;
                try {
                  const { facultyAttendanceApi } = await import("@/lib/api");
                  await facultyAttendanceApi.processSalaries();
                  toast.success("Faculty salaries processed");
                  qc.invalidateQueries({ queryKey: ["expenses"] });
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              <IndianRupee className="h-4 w-4" /> Process Salaries
            </Button>
            <Button className="gap-1.5" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </div>
        }
      />
      <PageBody>
        <DataTable
          rows={expenses}
          columns={columns}
          loading={isLoading}
          searchKeys={["category", "description"]}
          searchPlaceholder="Search expenses..."
          exportName="expenses"
        />
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <ExpenseForm 
            initial={editing} 
            faculty={faculty}
            onSuccess={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["expenses"] }); }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpenseForm({ initial, faculty, onSuccess }: { initial?: any; faculty: any[]; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Others",
    amount: "",
    description: "",
    payment_method: "Cash",
    faculty_id: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expensesApi.create({
        ...formData,
        amount: Number(formData.amount),
        faculty_id: formData.faculty_id || null,
      } as any);
      toast.success("Expense added");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData(d => ({ ...d, date: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Amount (₹)</Label>
          <Input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData(d => ({ ...d, amount: e.target.value }))} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={v => setFormData(d => ({ ...d, category: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={formData.payment_method} onValueChange={v => setFormData(d => ({ ...d, payment_method: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.category === "Salary" && (
        <div className="space-y-2">
          <Label>Paid to Faculty</Label>
          <Select value={formData.faculty_id} onValueChange={v => setFormData(d => ({ ...d, faculty_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select faculty" />
            </SelectTrigger>
            <SelectContent>
              {faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          placeholder="Notes, bill number, etc." 
          value={formData.description} 
          onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} 
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Expense"}
        </Button>
      </DialogFooter>
    </form>
  );
}
