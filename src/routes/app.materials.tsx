import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, Printer, Sparkles, Trash2, CheckCircle2 } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { generateMaterial } from "@/lib/materials.functions";
import { getInstitute } from "@/lib/academy-settings";
import { materialCss, materialDocument, materialPrintHtml, type MaterialBrand } from "@/lib/material-render";
import "katex/dist/katex.min.css";
import katexCssUrl from "katex/dist/katex.min.css?url";

type MatOut = { id: string; title: string; content: string; status: string; kind: string; subject?: string | null; chapter?: string | null; class_level?: string | null };

function brandFor(o: MatOut): MaterialBrand {
  const i = getInstitute();
  return {
    name: i.name || "Institute", logo: i.logo_url || "", color: i.primary_color || "#013062",
    address: i.address || "", phone: i.phone || "", email: i.email || "",
    subject: o.subject, chapter: o.chapter, classLevel: o.class_level, title: o.title,
  };
}

export const Route = createFileRoute("/app/materials")({
  head: () => ({
    meta: [
      { title: "Study Material Engine — Academix" },
      { name: "description", content: "Source library and AI-drafted, institute-branded study material." },
      { property: "og:title", content: "Study Material Engine — Academix" },
      { property: "og:description", content: "Source library and AI-drafted, institute-branded study material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaterialsPage,
});

const RIGHTS: Record<string, string> = {
  owned: "Owned by us",
  licensed: "Licensed",
  reference_only: "Reference only",
  unknown: "Rights unknown",
};
const KINDS = [
  { k: "notes", label: "Notes" },
  { k: "questions", label: "Question bank" },
  { k: "formula_sheet", label: "Formula sheet" },
] as const;

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function MaterialsPage() {
  const qc = useQueryClient();
  const gen = useServerFn(generateMaterial);
  const sources = useQuery({
    queryKey: ["material-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_sources").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const outputs = useQuery({
    queryKey: ["material-outputs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_outputs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ title: "", programme: "", class_level: "", subject: "", chapter: "", rights_status: "reference_only", extracted_text: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      const { data: iid } = await supabase.rpc("current_institute_id");
      if (!iid) throw new Error("No institute");
      let meta: Record<string, unknown> = {};
      if (file) {
        if (!/\.(pdf|pptx|docx|png|jpe?g|txt)$/i.test(file.name)) throw new Error("Unsupported file type");
        const checksum = await sha256(file);
        const path = `${iid}/${checksum}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("materials").upload(path, file, { upsert: false });
        if (up.error && !/exists/i.test(up.error.message)) throw up.error;
        let text = form.extracted_text;
        if (file.type === "text/plain" && !text) text = await file.text();
        meta = { file_path: path, file_name: file.name, file_type: file.type, file_size: file.size, checksum, extracted_text: text || null };
      }
      const { error } = await supabase.from("material_sources").insert({
        institute_id: iid as string,
        title: form.title || file?.name || "Untitled",
        programme: form.programme || null,
        class_level: form.class_level || null,
        subject: form.subject || null,
        chapter: form.chapter || null,
        rights_status: form.rights_status,
        extracted_text: form.extracted_text || null,
        ...meta,
      });
      if (error) throw new Error(error.code === "23505" ? "This exact file is already in the library." : error.message);
    },
    onSuccess: () => {
      toast.success("Source added");
      setForm({ ...form, title: "", chapter: "", extracted_text: "" });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["material-sources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function run(sourceId: string, kind: (typeof KINDS)[number]["k"]) {
    setBusy(sourceId + kind);
    try {
      const r = await gen({ data: { sourceId, kind } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Draft ready in Outputs");
        qc.invalidateQueries({ queryKey: ["material-outputs"] });
      }
    } finally {
      setBusy(null);
    }
  }

  async function del(table: "material_sources" | "material_outputs", id: string) {
    await supabase.from(table).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: [table === "material_sources" ? "material-sources" : "material-outputs"] });
  }

  async function approve(o: { id: string; source_id: string | null }) {
    const src = sources.data?.find((s) => s.id === o.source_id);
    if (src?.rights_status === "unknown") return toast.error("Set the source's rights status before approving.");
    await supabase.from("material_outputs").update({ status: "approved" }).eq("id", o.id);
    qc.invalidateQueries({ queryKey: ["material-outputs"] });
  }

  async function save(id: string, content: string) {
    const { error } = await supabase.from("material_outputs").update({ content, status: "draft" }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["material-outputs"] });
  }

  function print(o: MatOut, content: string) {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow pop-ups to print.");
    w.document.write(materialPrintHtml(brandFor(o), content, new URL(katexCssUrl, location.href).href));
    w.document.close();
  }

  return (
    <>
      <PageHeader title="Study Material Engine" description="Upload sources, draft original branded notes, questions and formula sheets." />
      <PageBody>
        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Source library</TabsTrigger>
            <TabsTrigger value="outputs">Outputs ({outputs.data?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label>File (PDF, PPTX, DOCX, image, TXT)</Label>
                <Input type="file" accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              {(["title", "programme", "class_level", "subject", "chapter"] as const).map((k) => (
                <div key={k}>
                  <Label className="capitalize">{k.replace("_level", "")}</Label>
                  <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k === "programme" ? "JEE Main / NEET / Foundation" : ""} />
                </div>
              ))}
              <div>
                <Label>Rights status</Label>
                <Select value={form.rights_status} onValueChange={(v) => setForm({ ...form, rights_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RIGHTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label>Reference text (optional — paste chapter text or topics)</Label>
                <Textarea rows={3} value={form.extracted_text} onChange={(e) => setForm({ ...form, extracted_text: e.target.value })} />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button onClick={() => add.mutate()} disabled={add.isPending || (!file && !form.title)}>
                  {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Add source
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {sources.data?.length === 0 && <p className="text-sm text-muted-foreground">No sources yet.</p>}
              {sources.data?.map((s) => (
                <div key={s.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[s.programme, s.class_level, s.subject, s.chapter].filter(Boolean).join(" · ") || "No tags"}
                        {s.file_size ? ` · ${(s.file_size / 1e6).toFixed(1)} MB` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={s.rights_status === "owned" || s.rights_status === "licensed" ? "default" : "secondary"}>{RIGHTS[s.rights_status]}</Badge>
                      {KINDS.map((k) => (
                        <Button key={k.k} size="sm" variant="outline" disabled={!!busy} onClick={() => run(s.id, k.k)}>
                          {busy === s.id + k.k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {k.label}
                        </Button>
                      ))}
                      <Button size="icon" variant="ghost" onClick={() => del("material_sources", s.id)} aria-label="Delete source"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="outputs" className="space-y-2">
            {outputs.data?.length === 0 && <p className="text-sm text-muted-foreground">Generate from a source to see drafts here.</p>}
            {outputs.data?.map((o) => (
              <OutputCard key={o.id} o={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)}
                onSave={(c) => save(o.id, c)} onApprove={() => approve(o)} onPrint={(c) => print(o.title, c)} onDelete={() => del("material_outputs", o.id)} />
            ))}
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function OutputCard({ o, open, onToggle, onSave, onApprove, onPrint, onDelete }: {
  o: { id: string; title: string; content: string; status: string; kind: string };
  open: boolean; onToggle: () => void; onSave: (c: string) => void; onApprove: () => void; onPrint: (c: string) => void; onDelete: () => void;
}) {
  const [text, setText] = useState(o.content);
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="min-w-0 text-left" onClick={onToggle}>
          <p className="truncate font-medium">{o.title}</p>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant={o.status === "approved" ? "default" : "secondary"}>{o.status}</Badge>
          {o.status !== "approved" && <Button size="sm" variant="outline" onClick={onApprove}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>}
          <Button size="sm" variant="outline" onClick={() => onPrint(text)}><Printer className="h-3.5 w-3.5" /> Print / PDF</Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete output"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <Textarea rows={18} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
          <div className="flex justify-end"><Button size="sm" onClick={() => onSave(text)}>Save edits</Button></div>
        </div>
      )}
    </div>
  );
}
