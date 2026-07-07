import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/reports")({
  component: () => (
    <>
      <PageHeader title="Reports" description="Revenue, attendance, admissions, batches and student performance." />
      <PageBody>
        <EmptyState icon={BarChart3} title="Reports coming online"
          description="Monthly comparisons across every dimension of the institute." />
      </PageBody>
    </>
  ),
});