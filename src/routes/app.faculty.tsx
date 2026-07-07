import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Plus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/faculty")({
  component: () => (
    <>
      <PageHeader title="Faculty" description="Faculty profiles, today's classes, uploads and announcements."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add faculty</Button>} />
      <PageBody>
        <EmptyState icon={GraduationCap} title="No faculty added yet"
          description="Add your teachers to assign them to batches, tests and homework." />
      </PageBody>
    </>
  ),
});