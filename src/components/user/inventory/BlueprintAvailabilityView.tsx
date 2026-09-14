import { useFloorPlanAvailability } from '@/features/floor-plan';

interface BlueprintAvailabilityViewProps {
  planId?: string;
  blueprintId: string;
  start?: string;
  end?: string;
}

const AVAILABLE_FILL = '#10B981'; // primary green
const UNAVAILABLE_FILL = '#D1D5DB'; // neutral gray

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

export function BlueprintAvailabilityView({
  planId,
  blueprintId,
  start,
  end,
}: BlueprintAvailabilityViewProps) {
  const enabled = Boolean(planId && start && end);
  const query = useFloorPlanAvailability(enabled ? planId : undefined, { blueprintId, start, end });

  const data = query.data;
  const stats = data?.byBlueprint.find((entry) => entry.blueprintId === blueprintId) ?? {
    total: 0,
    available: 0,
    reserved: 0,
    locked: 0,
  };
  const plan = data?.plan;
  const units = data?.units ?? [];

  if (!planId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
        No floor plan is published for this venue yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">
          {enabled
            ? `${stats.available} of ${stats.total} available`
            : 'Availability for your selection'}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AVAILABLE_FILL }} />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNAVAILABLE_FILL }} />
            Occupied / locked
          </span>
        </div>
      </div>

      {!enabled ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          Select a date and time to see live availability and the floor plan.
        </div>
      ) : query.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      ) : plan ? (
        <svg
          viewBox={`0 0 ${plan.width || 1} ${plan.height || 1}`}
          className="h-auto w-full rounded-2xl border border-gray-200 bg-white"
          role="img"
          aria-label="Live availability floor plan"
        >
          {units.map((unit) => {
            const s = unit.spatial;
            const isTarget = unit.blueprintId === blueprintId;
            const fill = isTarget
              ? unit.available
                ? AVAILABLE_FILL
                : UNAVAILABLE_FILL
              : '#F3F4F6';
            const stroke = isTarget ? (unit.available ? '#059669' : '#9CA3AF') : '#E5E7EB';
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
                  fill={isTarget && unit.available ? '#ffffff' : '#111827'}
                >
                  {unit.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          No units on this floor plan.
        </div>
      )}
    </div>
  );
}
