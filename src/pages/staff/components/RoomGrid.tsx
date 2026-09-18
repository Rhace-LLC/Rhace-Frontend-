import { useMemo } from 'react';
import { BedDouble, LogIn, LogOut, Receipt, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PhysicalUnitDto, UnitReservationDto } from '@/types';

/** Hotel housekeeping states → label + colour. Anything else renders neutral. */
const ROOM_STATES: Record<string, { label: string; chip: string; dot: string }> = {
  vacant_clean: { label: 'Ready', chip: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  inspected: { label: 'Inspected', chip: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  vacant_dirty: { label: 'Dirty', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  cleaning_in_progress: { label: 'Cleaning', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  occupied: { label: 'Occupied', chip: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  out_of_order_ooo: {
    label: 'Out of order',
    chip: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
};

const stateMeta = (state: string) =>
  ROOM_STATES[state] ?? { label: state || 'Unknown', chip: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };

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
 * room's tab).
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
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        No rooms found on this floor plan yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {floors.map(([floor, floorUnits]) => (
        <div key={floor} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {floor}
            </h3>
            <Badge variant="secondary">{floorUnits.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {floorUnits.map((unit) => {
              const meta = stateMeta(unit.state);
              const res = reservationsByUnit.get(unit._id);
              const guest = res?.guestName || unit.session?.guestName;
              const isBusy = Boolean(res && busyReservationId === res._id);
              const canCheckIn = Boolean(res && res.status === 'upcoming' && onCheckIn);
              const canCheckOut = Boolean(res && res.status === 'active' && onCheckOut);
              return (
                <div
                  key={unit._id}
                  className="flex flex-col justify-between rounded-lg border bg-white p-3 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <BedDouble className="h-4 w-4 text-[#0A6C6D]" />
                        {unit.label}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          meta.chip,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>
                    {unit.state === 'out_of_order_ooo' && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600">
                        <Wrench className="h-3 w-3" /> Maintenance
                      </p>
                    )}
                    <p className="mt-1 truncate text-sm">
                      {guest ? (
                        <span className="font-medium">{guest}</span>
                      ) : (
                        <span className="text-muted-foreground">Vacant</span>
                      )}
                    </p>
                    {res && (
                      <p className="text-[11px] text-muted-foreground">{nightRange(res)}</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {canCheckIn && (
                      <Button
                        size="sm"
                        className="h-7 bg-[#0A6C6D] px-2 text-xs hover:bg-[#085a5b]"
                        disabled={isBusy}
                        onClick={() => res && onCheckIn?.(res)}
                      >
                        <LogIn className="mr-1 h-3 w-3" /> Check in
                      </Button>
                    )}
                    {canCheckOut && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={isBusy}
                        onClick={() => res && onCheckOut?.(res)}
                      >
                        <LogOut className="mr-1 h-3 w-3" /> Check out
                      </Button>
                    )}
                    {res && res.status === 'active' && onOpenTab && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onOpenTab(res)}
                      >
                        <Receipt className="mr-1 h-3 w-3" /> Tab
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(ROOM_STATES).map(([state, meta]) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
