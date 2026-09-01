import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { portalApi } from "@/lib/api/portal";
import { usePortalStudent, PortalCard } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal/homework")({
  head: () => ({
    meta: [
      { title: "Homework & Material — Academix Portal" },
      {
        name: "description",
        content: "Homework assigned to your batch with due dates and study material links.",
      },
      { property: "og:title", content: "Homework & Material — Academix Portal" },
      { property: "og:description", content: "Assignments and downloads for your batch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalHomework,
});

function PortalHomework() {
  const { student } = usePortalStudent();
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-homework", student?.batch_id],
    queryFn: () => portalApi.homework(student?.batch_id ?? null),
    enabled: !!student,
  });

  if (!student) return <p className="text-sm text-muted-foreground">No student linked.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const todayStr = new Date().toISOString().slice(0, 10);
  const pending = data.filter((h) => !h.due_date || String(h.due_date) >= todayStr);
  const past = data.filter((h) => h.due_date && String(h.due_date) < todayStr);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Homework</h1>

      <PortalCard title="Due now">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending. Well done.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((h) => (
              <HomeworkRow key={h.id} hw={h} />
            ))}
          </ul>
        )}
      </PortalCard>

      {past.length > 0 && (
        <PortalCard title="Earlier">
          <ul className="divide-y divide-border">
            {past.map((h) => (
              <HomeworkRow key={h.id} hw={h} />
            ))}
          </ul>
        </PortalCard>
      )}
    </div>
  );
}

type Hw = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  due_date?: string | null;
  attachment_url?: string | null;
};

function HomeworkRow({ hw }: { hw: Hw }) {
  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{hw.title}</p>
          <p className="text-xs text-muted-foreground">
            {hw.subject ?? "—"}
            {hw.due_date ? ` · Due ${hw.due_date}` : ""}
          </p>
          {hw.description && <p className="mt-1 text-sm text-muted-foreground">{hw.description}</p>}
        </div>
        {hw.attachment_url && (
          <a
            href={hw.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Open
          </a>
        )}
      </div>
    </li>
  );
}
