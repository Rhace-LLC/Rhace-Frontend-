import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { money } from '@/features/orders/money';
import type { FloorPlanDto, PhysicalUnitDto } from '@/types';
import { boothTitle, clubStateMeta, minimumSpendFor, boothSpend, spendPct } from '../club';

interface BoothMapProps {
  plan: FloorPlanDto;
  units: PhysicalUnitDto[];
  /** Blueprint id → required minimum spend. */
  minimumSpendByBlueprint?: Map<string, number>;
  /** Unit id → running order value. */
  spendByUnit?: Map<string, number>;
  /** Assignment refIds owned by the signed-in host — rendered with a ring. */
  assignedIds?: Set<string>;
  onOpenBooth?: (unit: PhysicalUnitDto) => void;
  selectedUnitId?: string | null;
  className?: string;
}

/**
 * Read-only scaled rendering of the club floor plan for the VIP host: every
 * booth in its saved position, showing its state and live spend progress
 * against the blueprint's minimum spend, with the host's own booths
 * highlighted and clickable to open the bottle-service pad.
 */
export default function BoothMap({
  plan,
  units,
  minimumSpendByBlueprint,
  spendByUnit,
  assignedIds,
  onOpenBooth,
  selectedUnitId,
  className,
}: BoothMapProps) {
  const aspect = plan.height > 0 ? plan.width / plan.height : 1.5;
  const pad = 12;

  const legend = useMemo(
    () => [
      { label: 'Available', className: 'bg-green-500' },
      { label: 'Reserved', className: 'bg-amber-500' },
      { label: 'Seated', className: 'bg-blue-500' },
      { label: 'Target met', className: 'bg-emerald-500' },
      { label: 'Closing', className: 'bg-purple-500' },
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
            This floor plan has no booths yet.
          </div>
        )}
        {units.map((unit) => {
          const s = unit.spatial;
          const minimum = minimumSpendFor(unit, minimumSpendByBlueprint);
          const spend = boothSpend(unit, spendByUnit);
          const pct = spendPct(spend, minimum);
          const met = minimum > 0 && spend >= minimum;
          const meta = clubStateMeta(unit.state);
          const isAssigned = assignedIds?.has(unit._id) ?? false;
          const isSelected = selectedUnitId === unit._id;
          const w = (s.width / plan.width) * 100;
          const h = (s.height / plan.height) * 100;
          const x = ((s.x + pad) / (plan.width + pad * 2)) * 100;
          const y = ((s.y + pad) / (plan.height + pad * 2)) * 100;
          const clickable = Boolean(onOpenBooth) && isAssigned;
          return (
            <button
              key={unit._id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onOpenBooth?.(unit)}
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
              className={cn(
                'absolute flex flex-col items-center justify-center overflow-hidden rounded-lg border text-center',
                isAssigned
                  ? 'border-2 border-[#0A6C6D] bg-white shadow-sm ring-1 ring-[#0A6C6D]/40'
                  : 'border-gray-300 bg-white/70',
                isSelected && 'ring-2 ring-[#0A6C6D]',
                clickable ? 'cursor-pointer hover:bg-[#0A6C6D]/5' : 'cursor-default',
              )}
              title={boothTitle(unit, minimum, spend)}
            >
              <span className="max-w-full truncate px-1 text-[10px] font-semibold leading-tight text-gray-800">
                {unit.label}
              </span>
              {minimum > 0 ? (
                <>
                  <span
                    className={cn(
                      'text-[9px] font-medium leading-tight',
                      met ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
                    {money(spend)} / {money(minimum)}
                  </span>
                  <span className="mt-0.5 h-1 w-3/4 overflow-hidden rounded-full bg-gray-200">
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        met ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </>
              ) : (
                <>
                  <span className={cn('mt-1 h-1.5 w-1.5 rounded-full', meta.dot)} />
                  <span className="text-[9px] leading-tight text-muted-foreground">
                    {meta.label}
                  </span>
                </>
              )}
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