import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { FloorEntity, FloorPlan } from './types';
import type { VerticalPlugin } from './plugin';
import type { CanvasState } from './useCanvasState';
import { EntityNode } from './EntityNode';
import { GridLayer } from './GridLayer';
import { LockBadge } from '../components/LockBadge';

interface CanvasSurfaceProps {
  plan: FloorPlan;
  plugin: VerticalPlugin;
  canvas: CanvasState;
  activeOverlays: string[];
  onSelect: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  setSelection: (ids: string[]) => void;
  onCommitPositions: (positions: Record<string, { x: number; y: number }>) => void;
  onCommitGeometry: (id: string, geometry: { x: number; y: number; width: number; height: number }) => void;
  onEditEntity: (id: string) => void;
  onDropNew: (kind: string, x: number, y: number, alt?: boolean) => void;
  isEntityLocked?: (id: string) => boolean;
  highlightUnitId?: string | null;
  fitSignal?: number;
}

interface DragState {
  active: boolean;
  ids: string[];
  startPlan: { x: number; y: number };
  origins: Record<string, { x: number; y: number }>;
}

interface ResizeState {
  active: boolean;
  id: string;
  dir: string;
  startPlan: { x: number; y: number };
  origin: { x: number; y: number; width: number; height: number };
}

interface PanState {
  active: boolean;
  lastX: number;
  lastY: number;
}

interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Marquee {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const HANDLES: Array<{ dir: string; className: string }> = [
  { dir: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
  { dir: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
  { dir: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
  { dir: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  { dir: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
  { dir: 's', className: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
  { dir: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
  { dir: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
];

function resizeGeometry(dir: string, origin: Geometry, dx: number, dy: number): Geometry {
  let { x, y, width, height } = origin;
  if (dir.includes('e')) width = origin.width + dx;
  if (dir.includes('s')) height = origin.height + dy;
  if (dir.includes('w')) {
    x = origin.x + dx;
    width = origin.width - dx;
  }
  if (dir.includes('n')) {
    y = origin.y + dy;
    height = origin.height - dy;
  }
  const MIN = 40;
  if (width < MIN) {
    if (dir.includes('w')) x -= MIN - width;
    width = MIN;
  }
  if (height < MIN) {
    if (dir.includes('n')) y -= MIN - height;
    height = MIN;
  }
  return { x, y, width, height };
}

export function CanvasSurface({
  plan,
  plugin,
  canvas,
  activeOverlays,
  onSelect,
  onToggleSelect,
  setSelection,
  onCommitPositions,
  onCommitGeometry,
  onEditEntity,
  onDropNew,
  isEntityLocked,
  highlightUnitId,
  fitSignal,
}: CanvasSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<PanState>({ active: false, lastX: 0, lastY: 0 });
  const dragRef = useRef<DragState>({ active: false, ids: [], startPlan: { x: 0, y: 0 }, origins: {} });
  const resizeRef = useRef<ResizeState>({
    active: false,
    id: '',
    dir: '',
    startPlan: { x: 0, y: 0 },
    origin: { x: 0, y: 0, width: 0, height: 0 },
  });
  const spaceRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<Record<string, { dx: number; dy: number }>>({});
  const [resizePreview, setResizePreview] = useState<(Geometry & { id: string }) | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const entities = plugin.filterEntities ? plugin.filterEntities(plan, plan.entities) : plan.entities;
  const structure = entities.filter((e) => e.spatialData.layer === 'structure');
  const areas = entities.filter((e) => e.spatialData.layer === 'area');
  const interactable = entities.filter(
    (e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area'
  );
  const selectable = [...areas, ...structure, ...interactable];

  const selectedEntity =
    canvas.selection.length >= 1
      ? plan.entities.find((e) => e.entityId === canvas.selection[0]) ?? null
      : null;

  const clientToPlan = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { x, y, scale } = canvas.viewport;
    return {
      x: (event.clientX - rect.left - x) / scale,
      y: (event.clientY - rect.top - y) / scale,
    };
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        canvas.panBy(-event.deltaX, 0);
        return;
      }
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      canvas.zoomAt(point, event.deltaY < 0 ? 1.1 : 0.9);
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => node.removeEventListener('wheel', handler);
  }, [canvas]);

  useEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    canvas.fit(plan.width, plan.height, rect.width, rect.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.floor, plan.floorPlanId, fitSignal]);

  // Space-to-pan.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = true;
        setSpaceHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const computeGuides = (ids: string[], dx: number, dy: number) => {
    const moving = plan.entities.filter((e) => ids.includes(e.entityId));
    const others = plan.entities.filter((e) => !ids.includes(e.entityId));
    const v: number[] = [];
    const h: number[] = [];
    for (const m of moving) {
      const mx = m.spatialData.x + dx;
      const my = m.spatialData.y + dy;
      const mcx = mx + m.spatialData.width / 2;
      const mcy = my + m.spatialData.height / 2;
      for (const o of others) {
        const ox = o.spatialData.x;
        const oy = o.spatialData.y;
        const ocx = ox + o.spatialData.width / 2;
        const ocy = oy + o.spatialData.height / 2;
        if (Math.abs(mx - ox) < 6 || Math.abs(mcx - ocx) < 6) v.push(ox);
        if (Math.abs(my - oy) < 6 || Math.abs(mcy - ocy) < 6) h.push(oy);
      }
    }
    setGuides({ v: [...new Set(v)].slice(0, 4), h: [...new Set(h)].slice(0, 4) });
  };

  const startResize = (event: ReactPointerEvent, dir: string, entity: FloorEntity) => {
    event.stopPropagation();
    const s = entity.spatialData;
    resizeRef.current = {
      active: true,
      id: entity.entityId,
      dir,
      startPlan: clientToPlan(event),
      origin: { x: s.x, y: s.y, width: s.width, height: s.height },
    };
    setResizePreview({ id: entity.entityId, x: s.x, y: s.y, width: s.width, height: s.height });
    containerRef.current?.setPointerCapture(event.pointerId);
  };

  const isPanGesture = (event: ReactPointerEvent) =>
    event.altKey || event.button === 1 || spaceRef.current || canvas.panTool;

  const startPan = (event: ReactPointerEvent) => {
    if (!event.shiftKey) onSelect(null);
    panRef.current = { active: true, lastX: event.clientX, lastY: event.clientY };
    containerRef.current?.setPointerCapture(event.pointerId);
  };

  const handleEntityPointerDown = (event: ReactPointerEvent, id: string) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.stopPropagation();

    if (isPanGesture(event)) {
      startPan(event);
      return;
    }

    if (canvas.mode === 'manage') {
      onSelect(id);
      onEditEntity(id);
      return;
    }

    const already = canvas.selection.includes(id);
    if (event.shiftKey) {
      onToggleSelect(id);
      return;
    }
    let ids = canvas.selection;
    if (!already) {
      onSelect(id);
      ids = [id];
    }
    const origins: Record<string, { x: number; y: number }> = {};
    plan.entities.forEach((entity) => {
      if (ids.includes(entity.entityId)) {
        origins[entity.entityId] = { x: entity.spatialData.x, y: entity.spatialData.y };
      }
    });
    dragRef.current = { active: true, ids, startPlan: clientToPlan(event), origins };
    containerRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    // Entity clicks are handled by EntityNode.
    if ((event.target as HTMLElement).closest('[data-entity-id]')) return;

    if (isPanGesture(event) || canvas.mode === 'manage') {
      startPan(event);
      return;
    }

    const planPoint = clientToPlan(event);
    if (!event.shiftKey) onSelect(null);
    setMarquee({ x1: planPoint.x, y1: planPoint.y, x2: planPoint.x, y2: planPoint.y });
    containerRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current.active) {
      const point = clientToPlan(event);
      const dx = point.x - resizeRef.current.startPlan.x;
      const dy = point.y - resizeRef.current.startPlan.y;
      setResizePreview({
        id: resizeRef.current.id,
        ...resizeGeometry(resizeRef.current.dir, resizeRef.current.origin, dx, dy),
      });
      return;
    }
    if (dragRef.current.active) {
      const point = clientToPlan(event);
      const dx = point.x - dragRef.current.startPlan.x;
      const dy = point.y - dragRef.current.startPlan.y;
      const next: Record<string, { dx: number; dy: number }> = {};
      dragRef.current.ids.forEach((id) => {
        next[id] = { dx, dy };
      });
      setDragOffset(next);
      computeGuides(dragRef.current.ids, dx, dy);
      return;
    }
    if (marquee) {
      const point = clientToPlan(event);
      const nextMarquee = { ...marquee, x2: point.x, y2: point.y };
      setMarquee(nextMarquee);
      const x1 = Math.min(nextMarquee.x1, nextMarquee.x2);
      const x2 = Math.max(nextMarquee.x1, nextMarquee.x2);
      const y1 = Math.min(nextMarquee.y1, nextMarquee.y2);
      const y2 = Math.max(nextMarquee.y1, nextMarquee.y2);
      setSelection(
        selectable
          .filter(
            (e) =>
              e.spatialData.x + e.spatialData.width > x1 &&
              e.spatialData.x < x2 &&
              e.spatialData.y + e.spatialData.height > y1 &&
              e.spatialData.y < y2
          )
          .map((e) => e.entityId)
      );
      return;
    }
    if (panRef.current.active) {
      canvas.panBy(event.clientX - panRef.current.lastX, event.clientY - panRef.current.lastY);
      panRef.current.lastX = event.clientX;
      panRef.current.lastY = event.clientY;
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current.active) {
      const point = clientToPlan(event);
      const dx = point.x - resizeRef.current.startPlan.x;
      const dy = point.y - resizeRef.current.startPlan.y;
      const geometry = resizeGeometry(resizeRef.current.dir, resizeRef.current.origin, dx, dy);
      const snap = canvas.snap ? canvas.grid.size : 1;
      onCommitGeometry(resizeRef.current.id, {
        x: Math.round(geometry.x / snap) * snap,
        y: Math.round(geometry.y / snap) * snap,
        width: Math.round(geometry.width / snap) * snap,
        height: Math.round(geometry.height / snap) * snap,
      });
      resizeRef.current.active = false;
      setResizePreview(null);
    }

    if (dragRef.current.active) {
      const point = clientToPlan(event);
      const dx = point.x - dragRef.current.startPlan.x;
      const dy = point.y - dragRef.current.startPlan.y;
      const snap = canvas.snap ? canvas.grid.size : 1;
      const snapValue = (value: number) => Math.round(value / snap) * snap;
      const positions: Record<string, { x: number; y: number }> = {};
      dragRef.current.ids.forEach((id) => {
        const origin = dragRef.current.origins[id];
        if (!origin) return;
        positions[id] = { x: snapValue(origin.x + dx), y: snapValue(origin.y + dy) };
      });

      // Areas carry their tables along.
      dragRef.current.ids.forEach((id) => {
        const moved = plan.entities.find((e) => e.entityId === id);
        if (!moved || moved.type !== 'area') return;
        const areaName = String(moved.businessData.name);
        plan.entities.forEach((entity) => {
          if (
            entity.entityId !== id &&
            entity.type !== 'area' &&
            String(entity.businessData.area) === areaName &&
            (entity.spatialData.floor ?? plan.floor) === (moved.spatialData.floor ?? plan.floor)
          ) {
            positions[entity.entityId] = {
              x: snapValue(entity.spatialData.x + dx),
              y: snapValue(entity.spatialData.y + dy),
            };
          }
        });
      });

      if (Object.keys(positions).length) onCommitPositions(positions);
      dragRef.current = { active: false, ids: [], startPlan: { x: 0, y: 0 }, origins: {} };
      setDragOffset({});
      setGuides({ v: [], h: [] });
    }

    setMarquee(null);
    panRef.current.active = false;
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const overlayCtx = { activeOverlays, toggleOverlay: () => {} };
  const handleSize = 10 / canvas.viewport.scale;
  const selectedGeometry =
    resizePreview && resizePreview.id === selectedEntity?.entityId
      ? resizePreview
      : selectedEntity
        ? {
            id: selectedEntity.entityId,
            x: selectedEntity.spatialData.x,
            y: selectedEntity.spatialData.y,
            width: selectedEntity.spatialData.width,
            height: selectedEntity.spatialData.height,
          }
        : null;

  const entityStyle = (entity: FloorEntity): CSSProperties | undefined => {
    if (resizePreview && resizePreview.id === entity.entityId) {
      return {
        left: resizePreview.x,
        top: resizePreview.y,
        width: resizePreview.width,
        height: resizePreview.height,
      };
    }
    const offset = dragOffset[entity.entityId];
    if (offset) {
      return {
        transform: `translate(${offset.dx}px, ${offset.dy}px) rotate(${entity.spatialData.rotation}deg)`,
      };
    }
    return undefined;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const kind = event.dataTransfer.getData('text/fp-kind');
        if (!kind) return;
        const point = clientToPlan(event);
        onDropNew(kind, point.x, point.y, event.altKey);
      }}
      className={`relative h-full w-full overflow-hidden ${plugin.theme.viewport} ${
        spaceHeld || canvas.panTool
          ? 'cursor-grab'
          : canvas.mode === 'edit'
            ? 'cursor-crosshair'
            : 'cursor-pointer'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div
        className={`absolute origin-top-left ${plugin.theme.canvas}`}
        style={{
          width: plan.width,
          height: plan.height,
          transform: `translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.scale})`,
        }}
      >
        {canvas.grid.visible && canvas.layers.structure && (
          <GridLayer
            width={plan.width}
            height={plan.height}
            size={canvas.grid.size}
            color={plugin.theme.gridLine}
          />
        )}

        {canvas.layers.structure &&
          structure.map((entity) => {
            const selected = canvas.selection.includes(entity.entityId);
            return (
              <EntityNode
                key={entity.entityId}
                entity={entity}
                selected={selected}
                onPointerDown={canvas.mode === 'edit' ? handleEntityPointerDown : undefined}
                onDoubleClick={canvas.mode === 'edit' ? onEditEntity : undefined}
                styleExtra={entityStyle(entity)}
                zIndex={0}
              >
                {plugin.renderStructureTile
                  ? plugin.renderStructureTile(entity, {
                      mode: canvas.mode,
                      selected,
                      vertical: plugin.id,
                    })
                  : (
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-lg border text-[10px] uppercase tracking-wide ${plugin.theme.structure}`}
                      >
                        {entity.businessData.name}
                      </div>
                    )}
              </EntityNode>
            );
          })}

        {canvas.layers.overlays &&
          (plugin.overlays ?? [])
            .filter((overlay) => activeOverlays.includes(overlay.id))
            .map((overlay) => (
              <div key={overlay.id} className="absolute inset-0 pointer-events-none">
                {overlay.render(plan, overlayCtx)}
              </div>
            ))}

        {/* Area zones */}
        {canvas.layers.entities &&
          areas.map((entity) => (
            <EntityNode
              key={entity.entityId}
              entity={entity}
              selected={canvas.selection.includes(entity.entityId)}
              onPointerDown={handleEntityPointerDown}
              onDoubleClick={canvas.mode === 'edit' ? onEditEntity : undefined}
              styleExtra={entityStyle(entity)}
              zIndex={1}
            >
              {plugin.renderAreaTile
                ? plugin.renderAreaTile(entity, {
                    mode: canvas.mode,
                    selected: canvas.selection.includes(entity.entityId),
                    vertical: plugin.id,
                  })
                : (
                    <div className="h-full w-full rounded-xl border-2 border-dashed border-teal-400/60 bg-teal-500/5 p-2 text-[11px] font-medium text-teal-700">
                      {entity.businessData.name}
                    </div>
                  )}
            </EntityNode>
          ))}

        {/* Entity layer (tables, rooms, objects) */}
        {canvas.layers.entities &&
          interactable.map((entity) => {
            const selected = canvas.selection.includes(entity.entityId);
            return (
              <EntityNode
                key={entity.entityId}
                entity={entity}
                selected={selected}
                onPointerDown={handleEntityPointerDown}
                onDoubleClick={canvas.mode === 'edit' ? onEditEntity : undefined}
                styleExtra={entityStyle(entity)}
                zIndex={10}
              >
                {plugin.renderTile(entity, {
                  mode: canvas.mode,
                  selected,
                  vertical: plugin.id,
                })}
                {isEntityLocked?.(entity.entityId) && (
                  <div className="absolute right-1 top-1 z-10">
                    <LockBadge />
                  </div>
                )}
                {highlightUnitId === entity.entityId && (
                  <div className="pointer-events-none absolute inset-0 z-20 animate-pulse rounded-lg ring-4 ring-teal-400/80" />
                )}
              </EntityNode>
            );
          })}

        {/* Alignment guides */}
        {guides.v.map((g, i) => (
          <div
            key={`v${i}`}
            className="pointer-events-none absolute w-px bg-teal-500/70"
            style={{ left: g, top: -4000, height: 8000, zIndex: 55 }}
          />
        ))}
        {guides.h.map((g, i) => (
          <div
            key={`h${i}`}
            className="pointer-events-none absolute h-px bg-teal-500/70"
            style={{ top: g, left: -4000, width: 8000, zIndex: 55 }}
          />
        ))}

        {/* Resize handles for the primary selection in edit mode */}
        {canvas.mode === 'edit' && selectedEntity && selectedGeometry && (
          <div
            className="absolute"
            style={{
              left: selectedGeometry.x,
              top: selectedGeometry.y,
              width: selectedGeometry.width,
              height: selectedGeometry.height,
              zIndex: 60,
              transform: `rotate(${selectedEntity.spatialData.rotation}deg)`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 border-2 border-teal-500" />
            {HANDLES.map((handle) => (
              <div
                key={handle.dir}
                data-handle={handle.dir}
                onPointerDown={(event) => startResize(event, handle.dir, selectedEntity)}
                className={`absolute rounded-sm border border-teal-600 bg-white ${handle.className}`}
                style={{ width: handleSize, height: handleSize, zIndex: 61 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Marquee in screen space */}
      {marquee && (
        <div
          className="pointer-events-none absolute rounded border border-teal-500 bg-teal-500/10"
          style={{
            left: canvas.viewport.x + Math.min(marquee.x1, marquee.x2) * canvas.viewport.scale,
            top: canvas.viewport.y + Math.min(marquee.y1, marquee.y2) * canvas.viewport.scale,
            width: Math.abs(marquee.x2 - marquee.x1) * canvas.viewport.scale,
            height: Math.abs(marquee.y2 - marquee.y1) * canvas.viewport.scale,
          }}
        />
      )}
    </div>
  );
}
