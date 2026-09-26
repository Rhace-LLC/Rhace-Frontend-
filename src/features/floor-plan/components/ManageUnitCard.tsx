import type { ReactNode } from 'react';
import { Settings2, Users } from 'lucide-react';

/**
 * Shared staff card for the Rooms / Tables manage board. One standard for
 * hotel rooms and club / restaurant tables: kind-prefixed title, status pill,
 * guest + location context, a slot for vertical extras, and a full-width
 * Manage action.
 */
interface ManageUnitCardProps {
  kind: 'Table' | 'Room';
  name: string;
  typeLabel?: string;
  statusLabel: string;
  statusColor: string;
  guestLabel?: string;
  locationLabel?: string;
  extras?: ReactNode;
  onManage: () => void;
}

export function ManageUnitCard({
  kind,
  name,
  typeLabel,
  statusLabel,
  statusColor,
  guestLabel,
  locationLabel,
  extras,
  onManage,
}: ManageUnitCardProps) {
  return (
    <article className="flex h-full w-full flex-col rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="type-res-h3 line-clamp-1 text-res-ink">
            {kind} {name}
          </h3>
          {typeLabel && (
            <p className="type-res-small line-clamp-1 font-normal text-res-ink-muted">
              {typeLabel}
            </p>
          )}
        </div>
        <span
          className="type-res-small shrink-0 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap"
          style={{ backgroundColor: `${statusColor}1A`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {(guestLabel || locationLabel) && (
        <div className="type-res-small mt-2.5 space-y-1 font-normal text-res-ink-muted">
          {guestLabel && (
            <p className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0 text-res-brand" />
              <span className="line-clamp-1">{guestLabel}</span>
            </p>
          )}
          {locationLabel && <p className="line-clamp-1">{locationLabel}</p>}
        </div>
      )}

      {extras && <div className="mt-2.5">{extras}</div>}

      <button
        type="button"
        onClick={onManage}
        className="type-res-body mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
      >
        <Settings2 size={14} /> Manage
      </button>
    </article>
  );
}
