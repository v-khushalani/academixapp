import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageBody } from "@/components/app/page-header";

const sections = [
  { title: "Institute details", body: "Name, logo, address and academic year." },
  { title: "Courses & subjects", body: "Define your courses and their subjects." },
  { title: "Fee structures", body: "Templates for installments, discounts and scholarships." },
  { title: "Users & permissions", body: "Owner, Admin, Faculty, Receptionist, Counsellor, Accountant, Student, Parent." },
  { title: "Branding", body: "Colors, favicons and email templates." },
  { title: "Integrations", body: "WhatsApp, SMS, Email and payment providers." },
];

export const Route = createFileRoute("/app/settings")({
  component: () => (
    <>
      <PageHeader title="Settings" description="Configure VK Academy the way you run it." />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30">
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  ),
});