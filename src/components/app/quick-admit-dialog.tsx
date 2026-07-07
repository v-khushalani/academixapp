import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [link, setLink] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");

  useEffect(() => {
    if (open) {
      setFullName(""); setPhone(""); setLink(null); setStudentName(""); setStudentPhone("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const token = makeToken();
      const admission_no = `ADM-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase
        .from("students")
        .insert({ full_name: fullName.trim(), phone: phone.trim() || null, admission_no, onboarding_token: token, status: "active" })
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
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    mut.mutate();
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied"));
  }

  function sendWhatsApp() {
    if (!link) return;
    const msg = `Hello ${studentName},\n\nWelcome to VK Academy. Please fill your admission details using the link below:\n${link}\n\nThank you.`;
    if (!openWhatsApp(studentPhone, msg)) toast.error("No phone number on file. Copy the link instead.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{link ? "Share onboarding link" : "Quick admission"}</DialogTitle>
        </DialogHeader>

        {!link ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (WhatsApp)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll create the student and give you a link. The student fills the remaining details themselves.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Creating…" : "Create & get link"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <p className="break-all font-mono text-xs">{link}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={copyLink}>
                <Copy className="h-4 w-4" />Copy link
              </Button>
              <Button type="button" className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={sendWhatsApp}>
                <MessageCircle className="h-4 w-4" />Send on WhatsApp
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}