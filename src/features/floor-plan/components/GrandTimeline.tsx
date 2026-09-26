import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { LockBadge } from './LockBadge';
import { isLocked, reservationsForUnit } from '../domain/reservations';
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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromISODate(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Monday of the week containing `date`. */
function mondayOf(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Mon–Sun strip for the week containing `date`. */
function weekDays(date: Date): Date[] {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

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
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ unitId: string; collision: boolean } | null>(null);

  const selected = fromISODate(selectedISO) ?? startOfDay(new Date());
  const days = useMemo(() => weekDays(selected), [selectedISO]);
  const isCurrentWeek = mondayOf(new Date()).getTime() === mondayOf(selected).getTime();

  const shiftWeek = (delta: number) => {
    const d = new Date(selected);
    d.setDate(d.getDate() + delta * 7);
    setSelectedISO(toISODate(d));
  };

  const jumpToToday = () => setSelectedISO(toISODate(new Date()));

  const dayStartMs = startOfDay(selected).getTime();
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-low">
      <div className="flex flex-wrap items-center gap-2 border-b border-res-line px-4 py-3">
        <h2 className="type-res-h3 text-res-ink">Bookings calendar</h2>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
            className="cursor-pointer rounded-full bg-res-surface p-2 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
            className="cursor-pointer rounded-full bg-res-surface p-2 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
          >
            <ChevronRight size={15} />
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={jumpToToday}
              className="type-res-small cursor-pointer rounded-full bg-res-surface px-3.5 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              This week
            </button>
          )}
          <label
            className="type-res-small flex cursor-pointer items-center gap-1.5 rounded-full bg-res-surface px-3.5 py-2 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
            onClick={(e) => {
              // Open the native calendar straight away (sr-only input stays tabbable).
              const input = e.currentTarget.querySelector('input');
              try {
                (input as HTMLInputElement | null)?.showPicker?.();
              } catch {
                (input as HTMLInputElement | null)?.focus();
              }
            }}
          >
            <CalendarDays size={14} />
            Pick a date
            <input
              type="date"
              value={selectedISO}
              onChange={(e) => {
                if (e.target.value) setSelectedISO(e.target.value);
              }}
              className="sr-only"
              aria-label="Pick a date"
            />
          </label>
        </div>
        <div className="hide-scrollbar -mx-1 flex w-full gap-1 overflow-x-auto px-1 py-0.5">
          {days.map((day) => {
            const iso = toISODate(day);
            const isActive = iso === selectedISO;
            const isToday = iso === toISODate(new Date());
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedISO(iso)}
                aria-pressed={isActive}
                className={`type-res-small flex-1 cursor-pointer rounded-full px-2 py-1.5 whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                  isActive
                    ? 'bg-res-brand font-semibold text-res-ink-inverted shadow-res-low'
                    : 'font-medium text-res-ink-muted hover:bg-res-surface hover:text-res-ink'
                } ${!isActive && isToday ? 'ring-1 ring-res-brand' : ''}`}
              >
                {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </button>
            );
          })}
        </div>
        <p className="type-res-small w-full font-normal text-res-ink-muted">
          {selected.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
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
