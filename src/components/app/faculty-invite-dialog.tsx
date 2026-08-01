import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field as F } from "@/components/app/field";
import { supabase } from "@/integrations/supabase/client";
import { getInstitute } from "@/lib/academy-settings";
import { openWhatsApp } from "@/lib/whatsapp";

/**
 * Teachers never self-register: the institute sends them a one-time link on
 * WhatsApp, and signing up through it hands them the faculty role automatically.
 */
export function FacultyInviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [link, setLink] = useState<string | null>(null);

  const academy = getInstitute().name || "our academy";

  const mut = useMutation({
    mutationFn: async () => {
      const { data: inst, error: instErr } = await supabase.rpc("current_institute_id");
      if (instErr) throw instErr;
      const { data, error } = await supabase
        .from("faculty_invites")
        .insert({
          full_name: name.trim(),
          phone: phone.trim() || null,
          subject: subject.trim() || null,
          institute_id: inst as string,
        })
        .select("token")
        .single();
      if (error) throw error;
      return `${window.location.origin}/join/${data.token}`;
    },
    onSuccess: (url) => {
      setLink(url);
      qc.invalidateQueries({ queryKey: ["faculty-invites"] });
      toast.success("Invite link ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const message = `Hello ${name || "Sir/Ma'am"},\n\nPlease set up your teacher account for *${academy}* using this link:\n${link}\n\nYou'll be able to mark attendance and enter test marks from your phone.`;

  function reset() {
    setName("");
    setPhone("");
    setSubject("");
    setLink(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teacher</DialogTitle>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send this link to {name}. It works once and expires in 7 days.
            </p>
            <div className="break-all rounded-md border border-border bg-muted/40 p-2 text-xs">
              {link}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={() => {
                  if (!openWhatsApp(phone, message)) {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(message)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                <Send className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!name.trim()) return toast.error("Teacher name is required");
              mut.mutate();
            }}
          >
            <F label="Teacher name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </F>
            <F label="WhatsApp number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                inputMode="numeric"
              />
            </F>
            <F label="Subject">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Physics"
              />
            </F>
            <DialogFooter>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Creating…" : "Create invite link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}