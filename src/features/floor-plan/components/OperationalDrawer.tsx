import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/others/RhaceModal';
import { LockBadge } from './LockBadge';
import { next7Days } from '../domain/availability';
import { canTransition } from '../domain/transitions';
import { isLocked } from '../domain/reservations';
import type { BusinessData, FloorEntity, SpatialData } from '../core/types';
import type { Reservation, UnitState, Vertical } from '../domain/types';
import type { VerticalPlugin } from '../core/plugin';

interface OperationalDrawerProps {
  entity: FloorEntity;
  plugin: VerticalPlugin;
  vertical: Vertical;
  reservations: Reservation[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (patch: {
    businessData?: Partial<BusinessData>;
    spatialData?: Partial<SpatialData>;
  }) => void;
  onReservationChange?: (reservation: Reservation) => void;
}

const CHECK_IN_STATE: Record<Vertical, UnitState> = {
  hotel: 'occupied',
  club: 'arrived_seated',
  restaurant: 'seated_ordering',
};

const CHECK_OUT_STATE: Record<Vertical, UnitState> = {
  hotel: 'vacant_dirty',
  club: 'closing_payment',
  restaurant: 'dirty_bussing',
};

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function MiniGantt({
  reservations,
  onExtend,
}: {
  reservations: Reservation[];
  onExtend: (id: string, end: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const days = next7Days();
  const startMs = new Date(days[0].start).getTime();
  const unit = 100 / 7;
  const [drag, setDrag] = useState<{ id: string; deltaDays: number } | null>(null);

  const handleMove = (event: ReactPointerEvent) => {
    if (!drag || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const daysFromStart = ratio * 7;
    setDrag({ ...drag, deltaDays: Math.round(daysFromStart) });
  };

  const handleUp = () => {
    if (drag) {
      const reservation = reservations.find((r) => r.id === drag.id);
      if (reservation) {
        const originalDays = (new Date(reservation.end).getTime() - startMs) / DAY_MS;
        const extra = Math.max(1, drag.deltaDays) - originalDays;
        const nextEnd = new Date(
          new Date(reservation.end).getTime() + Math.max(0, extra) * DAY_MS
        ).toISOString();
        onExtend(reservation.id, nextEnd);
      }
    }
    setDrag(null);
  };

  return (
    <div>
      <div className="grid grid-cols-7 text-[9px] text-gray-400">
        {days.map((day) => (
          <div key={day.start} className="text-center">
            {new Date(day.start).toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
        ))}
      </div>
      <div ref={trackRef} className="relative mt-1 h-14 rounded bg-gray-100">
        {reservations.map((reservation) => {
          const s = new Date(reservation.start).getTime();
          const e = new Date(reservation.end).getTime();
          const left = Math.max(0, ((s - startMs) / DAY_MS) * unit);
          const width = Math.min(100 - left, Math.max(unit, ((e - s) / DAY_MS) * unit));
          const active = reservation.status === 'active';
          return (
            <div
              key={reservation.id}
              className={`absolute top-1 flex h-11 items-start overflow-hidden rounded px-1 text-[9px] text-white ${
                active ? 'bg-teal-600' : 'bg-sky-500'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="truncate">{reservation.guestName}</span>
              <span
                onPointerDown={(event) => {
                  event.stopPropagation();
                  (event.target as HTMLElement).setPointerCapture(event.pointerId);
                  setDrag({ id: reservation.id, deltaDays: Math.ceil(((e - startMs) / DAY_MS)) });
                }}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/30"
                title="Drag to extend"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-7 text-[9px] text-gray-400">
        {days.map((day) => (
          <div key={`${day.start}-n`} className="text-center">
            {new Date(day.start).getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OperationalDrawer({
  entity,
  plugin,
  vertical,
  reservations,
  onClose,
  onDelete,
  onUpdate,
  onReservationChange,
}: OperationalDrawerProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const b = entity.businessData;
  const state = String(b.status ?? '');
  const unitReservations = reservations
    .filter((r) => r.unitId === entity.entityId)
    .sort((a, b2) => a.start.localeCompare(b2.start));
  const activeReservation = unitReservations.find((r) => r.status === 'active');
  const since = activeReservation?.start ?? (b.checkIn ? String(b.checkIn) : undefined);
  const locked = isLocked(entity.entityId);

  const quickActions: Array<{ label: string; target?: UnitState; onClick?: () => void }> = [
    { label: 'Check-In', target: CHECK_IN_STATE[vertical] },
    { label: 'Check-Out', target: CHECK_OUT_STATE[vertical] },
    { label: 'Extend Stay', onClick: () => {
      if (activeReservation && onReservationChange) {
        onReservationChange({
          ...activeReservation,
          end: new Date(new Date(activeReservation.end).getTime() + DAY_MS).toISOString(),
        });
      }
    } },
  ];
  if (vertical === 'hotel') quickActions.push({ label: 'Flag Maintenance', target: 'out_of_order_ooo' });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={b.name}
      subtitle={entity.type.replace(/_/g, ' ')}
      footer={
        <>
          <button
            onClick={() => onDelete(entity.entityId)}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {locked && (
          <div className="flex items-center gap-2">
            <LockBadge /> <span className="text-xs text-gray-500">Atomic booking lock active</span>
          </div>
        )}

        {/* Current active session */}
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">Current Session</p>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-gray-500">Guest</span>
            <span className="text-gray-900">
              {String(b.guestName ?? b.partyName ?? activeReservation?.guestName ?? '—')}
            </span>
            <span className="text-gray-500">Party size</span>
            <span className="text-gray-900">
              {String(b.partySize ?? activeReservation?.partySize ?? '—')}
            </span>
            <span className="text-gray-500">Checked in</span>
            <span className="text-gray-900">
              {since ? new Date(since).toLocaleTimeString() : '—'}
            </span>
            <span className="text-gray-500">Live duration</span>
            <span className="font-mono text-gray-900">{since ? formatDuration(now - new Date(since).getTime()) : '—'}</span>
            <span className="text-gray-500">POS ticket</span>
            <span className="text-gray-900">
              {vertical === 'club'
                ? `$${Number(b.currentSpend ?? 0).toLocaleString()} / $${Number(b.minimumSpend ?? 0).toLocaleString()}`
                : activeReservation?.posSpend
                  ? `$${activeReservation.posSpend.toLocaleString()}`
                  : 'Open'}
            </span>
            <span className="text-gray-500">Requests / notes</span>
            <span className="text-gray-900">
              {String(b.specialRequest ?? activeReservation?.notes ?? '—')}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const enabled =
              action.onClick != null ||
              (action.target ? canTransition(vertical, state, action.target) : false);
            return (
              <button
                key={action.label}
                disabled={!enabled}
                onClick={() => {
                  if (action.onClick) action.onClick();
                  else if (action.target) onUpdate({ businessData: { status: action.target } });
                }}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-40"
              >
                {action.label}
              </button>
            );
          })}
        </div>

        {/* 7-day mini-Gantt */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500">Next 7 days</p>
          <MiniGantt
            reservations={unitReservations}
            onExtend={(id, end) => {
              const reservation = unitReservations.find((r) => r.id === id);
              if (reservation && onReservationChange) {
                onReservationChange({ ...reservation, end });
              }
            }}
          />
        </div>

        {/* Blueprint specs + lifecycle actions */}
        {plugin.renderDrawer(entity, { mode: 'manage', onUpdate, onClose })}
      </div>
    </Modal>
  );
}
