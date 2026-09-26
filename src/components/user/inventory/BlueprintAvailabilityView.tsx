import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFloorPlanAvailability, useFloorPlanLayout } from '@/features/floor-plan';
import { Maximize2, Minus, Plus } from 'lucide-react';

interface BlueprintAvailabilityViewProps {
  planId?: string;
  blueprintId: string;
  start?: string;
  end?: string;
}

const AVAILABLE_FILL = '#00A86B'; // res-accent
const UNAVAILABLE_FILL = '#E5E7EB'; // res-brand-disabled
const STRUCTURE_FILL = '#E5E7EB';
const MIN_ZOOM = 1; // 1 = whole plan fits
const MAX_ZOOM = 6;

function shapeRadius(shape: string | undefined, width: number, height: number): number {
  switch (shape) {
    case 'round':
    case 'bar-seat':
      return width / 2;
    case 'oval':
      return height / 2;
    case 'booth':
    case 'cabana':
      return 12;
    case 'room':
      return 6;
    default:
      return 6;
  }
}

function formatKind(kind: string): string {
  return kind
    .split(/[_-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function BlueprintAvailabilityView({
  planId,
  blueprintId,
  start,
  end,
}: BlueprintAvailabilityViewProps) {
  const enabled = Boolean(planId && start && end);
  const query = useFloorPlanAvailability(enabled ? planId : undefined, { blueprintId, start, end });
  // Structures (walls, bar, stage…) are not part of the availability payload —
  // merge them in from the plan layout so the map reads as a real floor plan.
  // The layout endpoint may reject guests; failure just means no structures.
  const layoutQuery = useFloorPlanLayout(planId);

  const data = query.data;
  const stats = data?.byBlueprint.find((entry) => entry.blueprintId === blueprintId) ?? {
    total: 0,
    available: 0,
    reserved: 0,
    locked: 0,
  };
  const plan = data?.plan;
  const units = data?.units ?? [];
  const structures = useMemo(
    () => layoutQuery.data?.structures ?? [],
    [layoutQuery.data]
  );

  const planW = plan?.width || 0;
  const planH = plan?.height || 0;
  const viewportRef = useRef<HTMLDivElement>(null);

  // ─── Pan / zoom viewBox state ─────────────────────────────────────────────
  const [view, setView] = useState<ViewBox | null>(null);

  // Fit the whole plan whenever it (re)loads.
  useEffect(() => {
    if (planW > 0 && planH > 0) {
      setView({ x: 0, y: 0, w: planW, h: planH });
    } else {
      setView(null);
    }
  }, [planW, planH, planId]);

  const clampView = useCallback(
    (next: ViewBox): ViewBox => {
      if (planW <= 0 || planH <= 0) return next;
      const minW = planW / MAX_ZOOM;
      const w = Math.min(planW, Math.max(minW, next.w));
      const h = (w * next.h) / next.w || (planH * w) / planW;
      const marginX = w * 0.25;
      const marginY = h * 0.25;
      return {
        w,
        h,
        x: Math.min(planW - w + marginX, Math.max(-marginX, next.x)),
        y: Math.min(planH - h + marginY, Math.max(-marginY, next.y)),
      };
    },
    [planW, planH]
  );

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((prev) => {
        if (!prev || planW <= 0) return prev;
        const w = prev.w / factor;
        const h = prev.h / factor;
        // Keep the focal point stable; default to the viewport centre.
        const fx = cx ?? prev.x + prev.w / 2;
        const fy = cy ?? prev.y + prev.h / 2;
        const rx = (fx - prev.x) / prev.w;
        const ry = (fy - prev.y) / prev.h;
        return clampView({ w, h, x: fx - rx * w, y: fy - ry * h });
      });
    },
    [clampView, planW]
  );

  const zoomIn = useCallback(() => zoomAt(1.4), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / 1.4), [zoomAt]);
  const resetView = useCallback(() => {
    if (planW > 0 && planH > 0) setView({ x: 0, y: 0, w: planW, h: planH });
  }, [planW, planH]);

  // Wheel zoom (non-passive so we can prevent page scroll over the map).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !view) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * view.w + view.x;
      const py = ((e.clientY - rect.top) / rect.height) * view.h + view.y;
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, px, py);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, zoomAt]);

  // Pointer drag pan + two-finger pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; view: ViewBox } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        view: { ...(view as ViewBox) },
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !view) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinchStart.current.dist > 0) {
        const factor = dist / pinchStart.current.dist;
        const base = pinchStart.current.view;
        const w = base.w / factor;
        const h = base.h / factor;
        setView(clampView({ w, h, x: base.x + (base.w - w) / 2, y: base.y + (base.h - h) / 2 }));
      }
      return;
    }

    if (pointers.current.size === 1 && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const dx = ((e.clientX - prev.x) / rect.width) * view.w;
      const dy = ((e.clientY - prev.y) / rect.height) * view.h;
      setView(clampView({ ...view, x: view.x - dx, y: view.y - dy }));
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '+' || e.key === '=') zoomIn();
    else if (e.key === '-') zoomOut();
    else if (e.key === '0') resetView();
    else return;
    e.preventDefault();
  };

  const zoomLevel = view && planW > 0 ? planW / view.w : MIN_ZOOM;
  const canZoomIn = zoomLevel < MAX_ZOOM - 0.01;
  const canZoomOut = zoomLevel > MIN_ZOOM + 0.01;

  const targetUnits = units.filter((u) => u.blueprintId === blueprintId);
  const otherUnits = units.filter((u) => u.blueprintId !== blueprintId);

  if (!planId) {
    return (
      <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
        <p className="type-res-small font-normal text-res-ink-muted">
          No floor plan is published for this venue yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-res-h3 text-res-ink">
          {enabled
            ? `${stats.available} of ${stats.total} available`
            : 'Availability for your selection'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AVAILABLE_FILL }} />
            Available
          </span>
          <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNAVAILABLE_FILL }} />
            Occupied / locked
          </span>
          <span className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STRUCTURE_FILL }} />
            Fixtures
          </span>
        </div>
      </div>

      {!enabled ? (
        <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
          <p className="type-res-small font-normal text-res-ink-muted">
            Select a date and time to see live availability and the floor plan.
          </p>
        </div>
      ) : query.isLoading ? (
        <div className="h-72 animate-pulse rounded-res-md bg-res-surface sm:h-80" />
      ) : plan && view ? (
        <div>
          <div
            ref={viewportRef}
            tabIndex={0}
            role="application"
            aria-label="Floor plan. Drag to pan, scroll or use plus and minus keys to zoom, press zero to reset."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onDoubleClick={(e) => {
              const rect = viewportRef.current?.getBoundingClientRect();
              if (!rect) return zoomIn();
              const px = ((e.clientX - rect.left) / rect.width) * view.w + view.x;
              const py = ((e.clientY - rect.top) / rect.height) * view.h + view.y;
              zoomAt(1.6, px, py);
            }}
            onKeyDown={onKeyDown}
            className="relative h-72 touch-none overflow-hidden rounded-res-md bg-res-surface outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:h-80"
            style={{ cursor: pointers.current.size > 0 ? 'grabbing' : 'grab' }}
          >
            <svg
              viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
              role="img"
              aria-label="Live availability floor plan"
            >
              {/* Structure layer (walls, bar, stage…) — context under the units. */}
              {structures.map((s) => {
                const p = s.spatial;
                return (
                  <g key={s.id} opacity={0.9}>
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      rx={shapeRadius(p.shape, p.width, p.height)}
                      fill={STRUCTURE_FILL}
                      stroke={STRUCTURE_FILL}
                      strokeWidth={1}
                    />
                    {(s.label || s.kind) && (
                      <text
                        x={p.x + p.width / 2}
                        y={p.y + p.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.max(8, Math.min(p.width, p.height) / 5)}
                        fill="#8C94A0"
                      >
                        {s.label || formatKind(s.kind)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Other blueprints — muted context. */}
              {otherUnits.map((unit) => {
                const s = unit.spatial;
                return (
                  <g key={unit.id} opacity={0.55}>
                    <rect
                      x={s.x}
                      y={s.y}
                      width={s.width}
                      height={s.height}
                      rx={shapeRadius(s.shape, s.width, s.height)}
                      fill="#FFFFFF"
                      stroke="#F0F2F5"
                      strokeWidth={2}
                    />
                    <text
                      x={s.x + s.width / 2}
                      y={s.y + s.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(s.width, s.height) / 4)}
                      fill="#111827"
                    >
                      {unit.label}
                    </text>
                  </g>
                );
              })}

              {/* Selected blueprint — availability on top. */}
              {targetUnits.map((unit) => {
                const s = unit.spatial;
                const fill = unit.available ? AVAILABLE_FILL : UNAVAILABLE_FILL;
                const stroke = unit.available ? '#00A86B' : '#E5E7EB';
                return (
                  <g key={unit.id}>
                    <rect
                      x={s.x}
                      y={s.y}
                      width={s.width}
                      height={s.height}
                      rx={shapeRadius(s.shape, s.width, s.height)}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={2}
                    />
                    <text
                      x={s.x + s.width / 2}
                      y={s.y + s.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(s.width, s.height) / 4)}
                      fill={unit.available ? '#FFFFFF' : '#111827'}
                    >
                      {unit.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Zoom controls */}
            <div className="absolute top-2.5 right-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out"
                className="rounded-full bg-res-card p-2 shadow-res-low transition-all outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:opacity-40"
              >
                <Minus className="h-4 w-4 text-res-ink" />
              </button>
              <button
                type="button"
                onClick={resetView}
                aria-label="Reset view"
                className="rounded-full bg-res-card p-2 shadow-res-low transition-all outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <Maximize2 className="h-4 w-4 text-res-ink" />
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in"
                className="rounded-full bg-res-card p-2 shadow-res-low transition-all outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:opacity-40"
              >
                <Plus className="h-4 w-4 text-res-ink" />
              </button>
            </div>
          </div>
          <p className="type-res-small mt-2 text-center font-normal text-res-ink-muted">
            Drag to pan · Scroll or double-tap to zoom · {Math.round(zoomLevel * 100)}%
          </p>
        </div>
      ) : (
        <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
          <p className="type-res-small font-normal text-res-ink-muted">
            No units on this floor plan.
          </p>
        </div>
      )}
    </div>
  );
}
