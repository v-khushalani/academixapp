import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Phone, Plus } from "lucide-react";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { leads as initialLeads, type Lead } from "@/lib/mock/data";

export const Route = createFileRoute("/app/admissions")({
  component: AdmissionsPage,
});

const columns: { id: Lead["stage"]; title: string; hint?: string }[] = [
  { id: "new", title: "New Lead" },
  { id: "counselling", title: "Counselling" },
  { id: "demo", title: "Demo" },
  { id: "followup", title: "Follow Up" },
  { id: "admission", title: "Admission" },
  { id: "lost", title: "Lost" },
];

function AdmissionsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id as string | undefined;
    const activeId = e.active.id as string;
    if (!overId) return;
    const targetStage = columns.find((c) => c.id === overId)?.id;
    if (!targetStage) return;
    setLeads((prev) => prev.map((l) => (l.id === activeId ? { ...l, stage: targetStage } : l)));
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <>
      <PageHeader
        title="Admissions"
        description={`${leads.length} leads in pipeline`}
        actions={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New lead</Button>}
      />
      <PageBody>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => {
              const items = leads.filter((l) => l.stage === col.id);
              return <Column key={col.id} id={col.id} title={col.title} count={items.length} leads={items} />;
            })}
          </div>
          <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
        </DndContext>
      </PageBody>
    </>
  );
}

function Column({ id, title, count, leads }: { id: string; title: string; count: number; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex w-72 shrink-0 flex-col rounded-lg border ${isOver ? "border-primary bg-accent/40" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {leads.map((l) => <DraggableLead key={l.id} lead={l} />)}
        {leads.length === 0 && <p className="px-2 py-8 text-center text-xs text-muted-foreground">Drop leads here</p>}
      </div>
    </div>
  );
}

function DraggableLead({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <LeadCard lead={lead} />
    </div>
  );
}

function LeadCard({ lead, dragging = false }: { lead: Lead; dragging?: boolean }) {
  return (
    <div className={`cursor-grab rounded-md border border-border bg-card p-3 text-sm shadow-sm transition-shadow active:cursor-grabbing ${dragging ? "shadow-md" : "hover:border-primary/30"}`}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{lead.name}</p>
        <span className="text-xs text-muted-foreground">{lead.class}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
        <span>{lead.source}</span>
      </div>
      {lead.note && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{lead.note}</p>}
    </div>
  );
}