import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, Plus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/study-material")({
  component: () => (
    <>
      <PageHeader title="Study Material" description="Notes, worksheets, question banks and previous papers."
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add resource</Button>} />
      <PageBody>
        <EmptyState icon={FolderOpen} title="Organize material by class, subject and chapter"
          description="Upload PDFs, notes and worksheets. Students see them in their portal." />
      </PageBody>
    </>
  ),
});