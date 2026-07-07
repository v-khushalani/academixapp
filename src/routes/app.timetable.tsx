import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/timetable")({
  component: () => (
    <>
      <PageHeader title="Timetable" description="Weekly view, faculty view, classroom allocation." />
      <PageBody>
        <EmptyState icon={Calendar} title="Build your weekly timetable"
          description="Assign faculty, classrooms and subjects to time slots. Reschedule with drag & drop." />
      </PageBody>
    </>
  ),
});