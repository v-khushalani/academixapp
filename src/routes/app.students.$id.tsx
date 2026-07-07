import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Phone, MessageCircle, Bell, ArrowRightLeft, ArrowUpRight, UserX } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { students } from "@/lib/mock/data";

export const Route = createFileRoute("/app/students/$id")({
  loader: ({ params }) => {
    const student = students.find((s) => s.id === params.id);
    if (!student) throw notFound();
    return { student };
  },
  errorComponent: () => <ErrorFallback />,
  notFoundComponent: () => <ErrorFallback />,
  component: StudentDetail,
});

function ErrorFallback() {
  return (
    <PageBody>
      <p className="text-sm text-muted-foreground">Student not found.</p>
      <Button asChild variant="link"><Link to="/app/students">Back to students</Link></Button>
    </PageBody>
  );
}

function StudentDetail() {
  const { student: s } = Route.useLoaderData();
  return (
    <>
      <PageHeader
        title={s.name}
        description={`${s.admissionNo} · ${s.batch} · ${s.school}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/app/students"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5"><Phone className="h-4 w-4" />Call parent</Button>
            <Button size="sm" variant="outline" className="gap-1.5"><MessageCircle className="h-4 w-4" />WhatsApp</Button>
            <Button size="sm" className="gap-1.5"><Bell className="h-4 w-4" />Fee reminder</Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-accent text-2xl font-semibold text-primary">
                {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <p className="mt-3 text-base font-semibold">{s.name}</p>
              <Badge className="mt-1 bg-success/10 text-success" variant="secondary">{s.status}</Badge>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row k="Class" v={s.class} />
              <Row k="Batch" v={s.batch} />
              <Row k="Subjects" v={s.subjects.join(", ")} />
              <Row k="Parent" v={s.parentName} />
              <Row k="Phone" v={s.phone} />
              <Row k="Email" v={s.email} />
              <Row k="Address" v={s.address} />
              <Row k="Joined" v={s.admissionDate} />
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2"><ArrowRightLeft className="h-4 w-4" />Shift batch</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2"><ArrowUpRight className="h-4 w-4" />Promote</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2 text-destructive"><UserX className="h-4 w-4" />Deactivate</Button>
            </div>
          </aside>

          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Attendance" value={`${s.attendancePct}%`} tone={s.attendancePct >= 85 ? "success" : "warning"} />
              <Stat label="Avg Score" value={`${s.avgScore}%`} />
              <Stat label="Pending Fees" value={s.pendingFees === 0 ? "Clear" : `₹${s.pendingFees.toLocaleString("en-IN")}`} tone={s.pendingFees > 0 ? "danger" : "success"} />
            </div>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Summary of the student's most recent activity, tests and payments will appear here.
              </TabsContent>
              <TabsContent value="attendance" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Monthly attendance calendar with per-lecture status.
              </TabsContent>
              <TabsContent value="fees" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Fee schedule, receipts and outstanding installments.
              </TabsContent>
              <TabsContent value="performance" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Test-wise scores, subject strength and weak topic analysis.
              </TabsContent>
              <TabsContent value="documents" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Admission form, ID proof and other uploaded documents.
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PageBody>
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
function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneMap = { default: "text-foreground", success: "text-success", warning: "text-warning", danger: "text-destructive" } as const;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${toneMap[tone]}`}>{value}</p>
    </div>
  );
}