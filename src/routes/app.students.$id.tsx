import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Phone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentsApi } from "@/lib/api";
import { StudentFormDialog } from "@/components/app/student-form-dialog";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/rbac";

export const Route = createFileRoute("/app/students/$id")({
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canWrite = can("student:write", roles);
  const {
    data: s,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.get(id),
  });
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageBody>
    );
  if (error || !s)
    return (
      <PageBody>
        <p className="text-sm text-muted-foreground">Student not found.</p>
        <Button variant="link" onClick={() => navigate({ to: "/app/students" })}>
          Back to students
        </Button>
      </PageBody>
    );

  const initials = s.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      <PageHeader
        title={s.full_name}
        description={`${s.admission_no} · ${s.batch?.name ?? "No batch"}${s.school ? ` · ${s.school}` : ""}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/app/students">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {s.phone && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={`tel:${s.phone}`}>
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              </Button>
            )}
            {s.phone && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${s.phone.replace(/\D/g, "")}`}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            )}
            {canWrite && (
              <Button size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-accent text-2xl font-semibold text-primary">
                {initials}
              </div>
              <p className="mt-3 text-base font-semibold">{s.full_name}</p>
              <Badge className="mt-1 bg-success/10 text-success" variant="secondary">
                {s.status}
              </Badge>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row k="Class" v={s.class ?? "—"} />
              <Row k="Batch" v={s.batch?.name ?? "—"} />
              <Row k="Parent" v={s.parent_name ?? "—"} />
              <Row k="Phone" v={s.phone ?? "—"} />
              <Row k="Email" v={s.email ?? "—"} />
              <Row k="Address" v={s.address ?? "—"} />
              <Row k="Joined" v={s.admission_date} />
            </dl>
          </aside>

          <div>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
              <TabsContent
                value="overview"
                className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              >
                Overview of this student’s recent activity will appear here as data is added.
              </TabsContent>
              <TabsContent
                value="attendance"
                className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              >
                Attendance history — mark attendance from the Attendance page.
              </TabsContent>
              <TabsContent
                value="fees"
                className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              >
                Fee history — record payments from the Fees page.
              </TabsContent>
              <TabsContent
                value="performance"
                className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              >
                Test results — added automatically from the Tests page.
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PageBody>
      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={s} />
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right text-foreground">{v}</dd>
    </div>
  );
}
