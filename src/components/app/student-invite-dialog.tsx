import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInstitute } from "@/lib/academy-settings";
import { openWhatsApp } from "@/lib/whatsapp";
import { inviteUrl, studentInvitesApi, type InviteKind } from "@/lib/api/invites";

type Target = {
  id: string;
  full_name: string;
  phone?: string | null;
  parent_phone?: string | null;
  father_phone?: string | null;
  mother_phone?: string | null;
};

/**
 * Families never self-register either: the office generates a one-time portal
 * link and sends it on WhatsApp. Signing in through it links the account.
 */
export function StudentInviteDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Target | null;
}) {
  const qc = useQueryClient();
  const [links, setLinks] = useState<Partial<Record<InviteKind, string>>>({});
  const academy = getInstitute().name || "our institute";

  const mut = useMutation({
    mutationFn: async (kind: InviteKind) => {
      if (!student) throw new Error("No student selected");
      const token = await studentInvitesApi.create(student.id, kind);
      return { kind, url: inviteUrl(token) };
    },
    onSuccess: ({ kind, url }) => {
      setLinks((l) => ({ ...l, [kind]: url }));
      qc.invalidateQueries({ queryKey: ["student-invites"] });
      toast.success("Portal link ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parentPhone = student?.parent_phone || student?.father_phone || student?.mother_phone;

  function send(kind: InviteKind, phone: string | null | undefined) {
    const url = links[kind];
    if (!url || !student) return;
    const msg =
      kind === "student"
        ? `Hello ${student.full_name},\n\nYour ${academy} student portal is ready. Open the link below and sign in with Google to see your attendance, marks, fees and timetable:\n${url}\n\nThis link works once and expires in 30 days.`
        : `Hello,\n\nThe ${academy} parent portal for ${student.full_name} is ready. Open the link below and sign in with Google to follow attendance, test scores and fees:\n${url}\n\nThis link works once and expires in 30 days.`;
    if (!openWhatsApp(phone ?? null, msg)) toast.error("No phone number on file");
  }

  function row(kind: InviteKind, title: string, hint: string, phone: string | null | undefined) {
    const url = links[kind];
    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        {url ? (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input readOnly value={url} className="text-xs" />
              <Button
                size="icon"
                variant="outline"
                title="Copy link"
                onClick={() => {
                  void navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => send(kind, phone)}>
              <Send className="h-4 w-4" />
              Send on WhatsApp
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={mut.isPending}
            onClick={() => mut.mutate(kind)}
          >
            Generate link
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setLinks({});
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Portal access — {student?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {row(
            "student",
            "Student login",
            "Links this student's own Google account to their record.",
            student?.phone,
          )}
          {row(
            "parent",
            "Parent login",
            "Adds a parent account that can follow this student.",
            parentPhone,
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
