import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/lib/whatsapp";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function makeToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function QuickAdmitDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [preferred, setPreferred] = useState<"father" | "mother">("father");
  const [link, setLink] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");

  useEffect(() => {
    if (open) {
      setFullName("");
      setPhone("");
      setFatherName("");
      setFatherPhone("");
      setMotherName("");
      setMotherPhone("");
      setPreferred("father");
      setLink(null);
      setStudentName("");
      setStudentPhone("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const token = makeToken();
      const admission_no = `ADM-${Date.now().toString().slice(-6)}`;
      const parent_name = preferred === "mother" ? motherName.trim() : fatherName.trim();
      const parent_phone = preferred === "mother" ? motherPhone.trim() : fatherPhone.trim();
      const { data, error } = await supabase
        .from("students")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          father_name: fatherName.trim() || null,
          father_phone: fatherPhone.trim() || null,
          mother_name: motherName.trim() || null,
          mother_phone: motherPhone.trim() || null,
          parent_name: parent_name || null,
          parent_phone: parent_phone || null,
          preferred_contact: preferred,
          admission_no,
          onboarding_token: token,
          status: "active",
        })
        .select("id, full_name, phone, onboarding_token")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      const url = `${window.location.origin}/onboard/${row.onboarding_token}`;
      setLink(url);
      setStudentName(row.full_name);
      setStudentPhone(row.phone ?? "");
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student created. Share the link below.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!fatherName.trim() || !fatherPhone.trim()) {
      toast.error("Father's name & phone are required");
      return;
    }
    if (!motherName.trim() || !motherPhone.trim()) {
      toast.error("Mother's name & phone are required");
      return;
    }
    mut.mutate();
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied"));
  }

  function sendWhatsApp() {
    if (!link) return;
    const inst = (typeof window !== "undefined" && JSON.parse(window.localStorage.getItem("vk_institute") ?? "{}").name) || "our institute";
    const msg = `Hello ${studentName},\n\nWelcome to ${inst}. Please fill your admission details using the link below:\n${link}\n\nThank you.`;
    if (!openWhatsApp(studentPhone, msg))
      toast.error("No phone number on file. Copy the link instead.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{link ? "Share onboarding link" : "Quick admission"}</DialogTitle>
        </DialogHeader>

        {!link ? (
          <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Student name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Student phone (WhatsApp)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Father's name *</Label>
                <Input
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Father's phone *</Label>
                <Input
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  required
                  placeholder="10-digit"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mother's name *</Label>
                <Input
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mother's phone *</Label>
                <Input
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  required
                  placeholder="10-digit"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Who monitors studies? (default WhatsApp contact)</Label>
              <Select
                value={preferred}
                onValueChange={(v) => setPreferred(v as "father" | "mother")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll create the student and give you a link. The student fills the remaining details
              themselves (DOB, class, address, photo, etc.).
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Creating…" : "Create & get link"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <p className="break-all font-mono text-xs">{link}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button
                type="button"
                className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                onClick={sendWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Send on WhatsApp
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
