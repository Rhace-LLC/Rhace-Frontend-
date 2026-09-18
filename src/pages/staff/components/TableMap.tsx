import { useMemo } from 'react';
import type { FloorPlanLayoutDto, FloorPlanDto, PhysicalUnitDto } from '@/types';
import { cn } from '@/lib/utils';

/** Unit states that read as "free to seat" on the waiter's map. */
const FREE_STATES = new Set(['available', 'vacant_clean', 'inspected']);
/** States where guests are at the table. */
const OCCUPIED_STATES = new Set([
  'seated_ordering',
  'entrees_served',
  'awaiting_check',
  'arrived_seated',
  'under_target_spend',
  'target_met',
  'occupied',
]);
const DIRTY_STATES = new Set(['dirty_bussing', 'vacant_dirty']);
const HELD_STATES = new Set(['reserved_held', 'reserved_confirmed']);

const stateDot = (state: string) => {
  if (FREE_STATES.has(state)) return 'bg-green-500';
  if (OCCUPIED_STATES.has(state)) return 'bg-blue-500';
  if (DIRTY_STATES.has(state)) return 'bg-amber-500';
  if (HELD_STATES.has(state)) return 'bg-violet-500';
  return 'bg-gray-400';
};

interface TableMapProps {
  plan: FloorPlanDto;
  units: PhysicalUnitDto[];
  /** Assignment refIds owned by the signed-in waiter — rendered with a ring. */
  assignedIds?: Set<string>;
  onOpenTable?: (unit: PhysicalUnitDto) => void;
  selectedUnitId?: string | null;
  className?: string;
}

/**
 * Read-only scaled rendering of the vendor's floor plan for the waiter
 * workspace: every entity in its saved position, colour-coded by state, with
 * the waiter's own assigned tables highlighted and clickable.
 */
export default function TableMap({
  plan,
  units,
  assignedIds,
  onOpenTable,
  selectedUnitId,
  className,
}: TableMapProps) {
  const aspect = plan.height > 0 ? plan.width / plan.height : 1.5;
  const pad = 12;

  const legend = useMemo(
    () => [
      { label: 'Open', className: 'bg-green-500' },
      { label: 'Occupied', className: 'bg-blue-500' },
      { label: 'Reserved', className: 'bg-violet-500' },
      { label: 'Needs bussing', className: 'bg-amber-500' },
      { label: 'Mine', className: 'bg-[#0A6C6D]' },
    ],
    [],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className="relative w-full rounded-lg border bg-[#f8fafc]"
        style={{ aspectRatio: `${aspect}` }}
      >
        {units.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            This floor plan has no tables yet.
          </div>
        )}
        {units.map((unit) => {
          const s = unit.spatial;
          const isAssigned = assignedIds?.has(unit._id) ?? false;
          const isSelected = selectedUnitId === unit._id;
          const w = (s.width / plan.width) * 100;
          const h = (s.height / plan.height) * 100;
          const x = ((s.x + pad) / (plan.width + pad * 2)) * 100;
          const y = ((s.y + pad) / (plan.height + pad * 2)) * 100;
          const clickable = Boolean(onOpenTable) && isAssigned;
          return (
            <button
              key={unit._id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onOpenTable?.(unit)}
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
              className={cn(
                'absolute flex flex-col items-center justify-center overflow-hidden rounded-md border text-center',
                s.shape === 'round' || s.shape === 'oval' ? 'rounded-full' : '',
                isAssigned
                  ? 'border-2 border-[#0A6C6D] bg-white shadow-sm ring-1 ring-[#0A6C6D]/40'
                  : 'border-gray-300 bg-white/70',
                isSelected && 'ring-2 ring-[#0A6C6D]',
                clickable ? 'cursor-pointer hover:bg-[#0A6C6D]/5' : 'cursor-default',
              )}
              title={isAssigned ? `Open ${unit.label} for ordering` : unit.label}
            >
              <span className="max-w-full truncate px-1 text-[10px] font-medium leading-tight text-gray-800">
                {unit.label}
              </span>
              <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', stateDot(unit.state))} />
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', l.className)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
