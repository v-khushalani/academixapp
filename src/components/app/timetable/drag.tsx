import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** What is being dragged onto the board. */
export type DragPayload = {
  batchId?: string;
  facultyId?: string;
  subject?: string;
  /** an existing class card being moved / sent back to the rail */
  slotId?: string;
  label: string;
};

/** Where it landed: on an existing class card, an empty period cell, or back on the rail. */
export type DropTarget = { cardId: string } | { colId: string; bandStart: string } | { rail: true };

type Ctx = {
  begin: (payload: DragPayload, e: ReactPointerEvent) => void;
  active: DragPayload | null;
  hoverKey: string | null;
};

const DragCtx = createContext<Ctx | null>(null);

export function useTimetableDrag() {
  return useContext(DragCtx);
}

export const cellKey = (colId: string, bandStart: string) => `cell:${colId}|${bandStart}`;
export const cardKey = (id: string) => `card:${id}`;

function resolve(x: number, y: number): { key: string; target: DropTarget } | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;
  const card = el.closest<HTMLElement>("[data-drop-card]");
  if (card?.dataset.dropCard) {
    return { key: cardKey(card.dataset.dropCard), target: { cardId: card.dataset.dropCard } };
  }
  const cell = el.closest<HTMLElement>("[data-drop-col]");
  if (cell?.dataset.dropCol && cell.dataset.dropBand) {
    const colId = cell.dataset.dropCol;
    const bandStart = cell.dataset.dropBand;
    return { key: cellKey(colId, bandStart), target: { colId, bandStart } };
  }
  if (el.closest<HTMLElement>("[data-drop-rail]")) {
    return { key: "rail", target: { rail: true } };
  }
  return null;
}

const THRESHOLD = 6;

/**
 * Pointer-events drag. Unlike HTML5 drag-and-drop it needs no long press on
 * touch devices — the drag starts as soon as the finger moves a few pixels.
 */
export function TimetableDragProvider({
  onDrop,
  children,
}: {
  onDrop: (payload: DragPayload, target: DropTarget) => void;
  children: ReactNode;
}) {
  const [active, setActive] = useState<DragPayload | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const state = useRef<{
    payload: DragPayload;
    id: number;
    x0: number;
    y0: number;
    started: boolean;
  } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const begin = useCallback((payload: DragPayload, e: ReactPointerEvent) => {
    if (e.button != null && e.button > 0) return;
    state.current = { payload, id: e.pointerId, x0: e.clientX, y0: e.clientY, started: false };
  }, []);

  useEffect(() => {
    function move(e: PointerEvent) {
      const s = state.current;
      if (!s || e.pointerId !== s.id) return;
      if (!s.started) {
        if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < THRESHOLD) return;
        s.started = true;
        setActive(s.payload);
      }
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setHoverKey(resolve(e.clientX, e.clientY)?.key ?? null);
    }
    function up(e: PointerEvent) {
      const s = state.current;
      if (!s || e.pointerId !== s.id) return;
      state.current = null;
      if (s.started) {
        const hit = resolve(e.clientX, e.clientY);
        if (hit) dropRef.current(s.payload, hit.target);
      }
      setActive(null);
      setHoverKey(null);
      setPos(null);
    }
    function cancel() {
      state.current = null;
      setActive(null);
      setHoverKey(null);
      setPos(null);
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return (
    <DragCtx.Provider value={{ begin, active, hoverKey }}>
      {children}
      {active && pos && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg"
          style={{ left: pos.x, top: pos.y }}
        >
          {active.label}
        </div>
      )}
    </DragCtx.Provider>
  );
}

/** Props every draggable chip needs: instant pointer drag, no page scroll mid-drag. */
export function dragChipProps(payload: DragPayload, begin: Ctx["begin"] | undefined) {
  return {
    onPointerDown: (e: ReactPointerEvent) => begin?.(payload, e),
    style: { touchAction: "none" as const },
  };
}
