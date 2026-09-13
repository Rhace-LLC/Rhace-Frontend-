import { useMemo, useState } from 'react';
import { LockBadge } from './LockBadge';
import { isLocked, reservationsForUnit } from '../domain/reservations';
import { next7Days } from '../domain/availability';
import type { InventoryBlueprint, PhysicalUnit, Reservation, Vertical } from '../domain/types';

interface GrandTimelineProps {
  vertical: Vertical;
  blueprints: InventoryBlueprint[];
  units: PhysicalUnit[];
  reservations: Reservation[];
  highlightUnitId?: string | null;
  onReassign: (reservationId: string, targetUnitId: string) => void;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function overlapsWindow(reservation: Reservation, startMs: number, endMs: number) {
  return new Date(reservation.start).getTime() < endMs && new Date(reservation.end).getTime() > startMs;
}

export function GrandTimeline({
  blueprints,
  units,
  reservations,
  highlightUnitId,
  onReassign,
}: GrandTimelineProps) {
  const days = useMemo(() => next7Days(), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ unitId: string; collision: boolean } | null>(null);

  const dayStart = new Date(days[dayIndex].start);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + DAY_MS;

  const groups = blueprints
    .map((blueprint) => ({
      blueprint,
      units: units.filter((u) => u.blueprintId === blueprint.id),
    }))
    .filter((group) => group.units.length > 0);

  const dragging = dragId ? reservations.find((r) => r.id === dragId) ?? null : null;

  const evaluate = (unit: PhysicalUnit): boolean => {
    if (!dragging) return false;
    if (unit.id === dragging.unitId) return false;
    if (unit.blueprintId !== dragging.blueprintId) return false;
    if (isLocked(unit.id)) return false;
    const conflict = reservationsForUnit(reservations, unit.id).some((r) => {
      if (r.id === dragging.id) return false;
      const rs = new Date(r.start).getTime();
      const re = new Date(r.end).getTime();
      return rs < new Date(dragging.end).getTime() && new Date(dragging.start).getTime() < re;
    });
    return !conflict;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Grand Timeline</h2>
        <div className="ml-auto flex gap-1">
          {days.map((day, index) => (
            <button
              key={day.start}
              onClick={() => setDayIndex(index)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                index === dayIndex ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {new Date(day.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[1100px]">
          <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
            <div className="w-44 shrink-0 border-r border-gray-200 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Unit
            </div>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))]">
              {HOURS.map((hour) => (
                <div key={hour} className="border-r border-gray-100 px-1 py-1 text-center text-[9px] text-gray-400">
                  {hour}:00
                </div>
              ))}
            </div>
          </div>

          {groups.map(({ blueprint, units: groupUnits }) => {
            const isCollapsed = collapsed[blueprint.id];
            return (
              <div key={blueprint.id}>
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [blueprint.id]: !prev[blueprint.id] }))}
                  className="flex w-full items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-left text-xs font-semibold text-gray-700"
                >
                  <span>{isCollapsed ? '▸' : '▾'}</span>
                  {blueprint.name}
                  <span className="text-gray-400">({groupUnits.length})</span>
                </button>

                {!isCollapsed &&
                  groupUnits.map((unit) => {
                    const unitReservations = reservationsForUnit(reservations, unit.id).filter((r) =>
                      overlapsWindow(r, dayStartMs, dayEndMs)
                    );
                    const isDropTarget = dropTarget?.unitId === unit.id;
                    return (
                      <div
                        key={unit.id}
                        onDragOver={(event) => {
                          if (!dragging) return;
                          event.preventDefault();
                          setDropTarget({ unitId: unit.id, collision: !evaluate(unit) });
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragging && evaluate(unit)) onReassign(dragging.id, unit.id);
                          setDropTarget(null);
                          setDragId(null);
                        }}
                        className={`flex border-b border-gray-100 ${
                          isDropTarget
                            ? dropTarget?.collision
                              ? 'bg-red-50'
                              : 'bg-green-50'
                            : highlightUnitId === unit.id
                              ? 'bg-teal-50'
                              : ''
                        }`}
                      >
                        <div className="flex w-44 shrink-0 items-center gap-2 border-r border-gray-200 px-3 py-2 text-xs text-gray-700">
                          <span className="truncate">{unit.label}</span>
                          {isLocked(unit.id) && <LockBadge compact />}
                        </div>
                        <div className="relative grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))]">
                          {HOURS.map((hour) => (
                            <div key={hour} className="border-r border-gray-100" />
                          ))}
                          {unitReservations.map((reservation) => {
                            const s = new Date(reservation.start).getTime();
                            const e = new Date(reservation.end).getTime();
                            const startClamped = Math.max(s, dayStartMs);
                            const endClamped = Math.min(e, dayEndMs);
                            const left = ((startClamped - dayStartMs) / DAY_MS) * 100;
                            const width = Math.max(2, ((endClamped - startClamped) / DAY_MS) * 100);
                            return (
                              <div
                                key={reservation.id}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('text/res', reservation.id);
                                  setDragId(reservation.id);
                                }}
                                onDragEnd={() => {
                                  setDragId(null);
                                  setDropTarget(null);
                                }}
                                className={`absolute top-1 h-6 cursor-grab overflow-hidden rounded px-1 text-[9px] text-white ${
                                  reservation.status === 'active' ? 'bg-teal-600' : 'bg-sky-500'
                                }`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`${reservation.guestName} · ${reservation.partySize} pax`}
                              >
                                {reservation.guestName}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
