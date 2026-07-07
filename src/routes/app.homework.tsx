import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Upload } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/homework")({
  component: () => (
    <>
      <PageHeader title="Homework" description="Assignments, PDFs and submissions across all batches."
        actions={<Button size="sm" className="gap-1.5"><Upload className="h-4 w-4" />Upload</Button>} />
      <PageBody>
        <EmptyState icon={BookOpen} title="No homework yet"
          description="Upload assignments as PDF or images, set a due date and track submissions per student."
          action={<Button size="sm">Upload first assignment</Button>} />
      </PageBody>
    </>
  ),
});