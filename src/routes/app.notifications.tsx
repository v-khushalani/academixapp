import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";

export const Route = createFileRoute("/app/notifications")({
  component: () => (
    <>
      <PageHeader
        title="Notifications"
        description="WhatsApp, SMS, Email and push — all from reusable templates."
      />
      <PageBody>
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Templates and channels will appear here as you set them up."
        />
      </PageBody>
    </>
  ),
});
