import { useMemo } from 'react';
import { BedDouble, LogIn, LogOut, Receipt, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROOM_STATUS, roomStatusMeta } from './roomStatus';
import type { PhysicalUnitDto, UnitReservationDto } from '@/types';

/** Natural room ordering so 101 < 102 < 1001. */
const byLabel = (a: PhysicalUnitDto, b: PhysicalUnitDto) =>
  a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });

const nightRange = (r: UnitReservationDto) => {
  const start = r.start ? new Date(r.start).toLocaleDateString() : '';
  const end = r.end ? new Date(r.end).toLocaleDateString() : '';
  return start && end ? `${start} → ${end}` : start || end;
};

interface RoomGridProps {
  units: PhysicalUnitDto[];
  /** The reservation that currently holds (or is about to hold) each unit. */
  reservationsByUnit: Map<string, UnitReservationDto>;
  onCheckIn?: (reservation: UnitReservationDto) => void;
  onCheckOut?: (reservation: UnitReservationDto) => void;
  onOpenTab?: (reservation: UnitReservationDto) => void;
  /** Reservation id with an in-flight check-in/out, so its button can spin. */
  busyReservationId?: string | null;
  className?: string;
}

/**
 * Front-desk room grid: every room on the selected floor plans, grouped by
 * floor, showing housekeeping state, the in-house guest and the desk action
 * that applies (check in a due arrival, check out an in-house stay, open the
 * room's bill).
 */
export default function RoomGrid({
  units,
  reservationsByUnit,
  onCheckIn,
  onCheckOut,
  onOpenTab,
  busyReservationId,
  className,
}: RoomGridProps) {
  const floors = useMemo(() => {
    const grouped = new Map<string, PhysicalUnitDto[]>();
    for (const unit of [...units].sort(byLabel)) {
      const key = unit.floorId || 'Unassigned floor';
      const bucket = grouped.get(key);
      if (bucket) bucket.push(unit);
      else grouped.set(key, [unit]);
    }
    return [...grouped.entries()];
  }, [units]);

  if (units.length === 0) {
    return (
      <p className={cn('type-res-small py-8 text-center font-normal text-res-ink-muted', className)}>
        No rooms found on this floor plan yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {floors.map(([floor, floorUnits]) => (
        <div key={floor} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h3 className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              {floor}
            </h3>
            <span className="type-res-small rounded-full bg-res-surface px-2.5 py-0.5 font-semibold text-res-ink-muted">
              {floorUnits.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {floorUnits.map((unit) => {
              const meta = roomStatusMeta(unit.state);
              const res = reservationsByUnit.get(unit._id);
              const guest = res?.guestName || unit.session?.guestName;
              const isBusy = Boolean(res && busyReservationId === res._id);
              const canCheckIn = Boolean(res && res.status === 'upcoming' && onCheckIn);
              const canCheckOut = Boolean(res && res.status === 'active' && onCheckOut);
              return (
                <div
                  key={unit._id}
                  className="flex flex-col justify-between rounded-res-md border border-res-line bg-res-card p-3.5 shadow-res-low"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="type-res-body flex items-center gap-1.5 font-semibold text-res-ink">
                        <BedDouble className="h-4 w-4 shrink-0 text-res-brand" />
                        Room {unit.label}
                      </span>
                      <span
                        className={cn(
                          'type-res-small flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-semibold whitespace-nowrap',
                          meta.pill,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    {unit.state === 'out_of_order_ooo' && (
                      <p className="type-res-small mt-1.5 flex items-center gap-1 font-medium text-res-ink-muted">
                        <Wrench className="h-3 w-3" /> Needs maintenance
                      </p>
                    )}
                    <p className="type-res-body mt-1.5 truncate text-res-ink">
                      {guest ? (
                        <span className="font-medium">{guest}</span>
                      ) : (
                        <span className="font-normal text-res-ink-muted">Vacant</span>
                      )}
                    </p>
                    {res && (
                      <p className="type-res-small font-normal text-res-ink-muted">{nightRange(res)}</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {canCheckIn && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => res && onCheckIn?.(res)}
                        className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-brand px-3.5 py-1.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LogIn className="h-3 w-3" /> Check in
                      </button>
                    )}
                    {canCheckOut && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => res && onCheckOut?.(res)}
                        className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-surface px-3.5 py-1.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LogOut className="h-3 w-3" /> Check out
                      </button>
                    )}
                    {res && res.status === 'active' && onOpenTab && (
                      <button
                        type="button"
                        onClick={() => onOpenTab(res)}
                        className="type-res-small flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
                      >
                        <Receipt className="h-3 w-3" /> Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="type-res-small flex flex-wrap items-center gap-x-4 gap-y-1.5 font-normal text-res-ink-muted">
        {Object.entries(ROOM_STATUS).map(([state, meta]) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
