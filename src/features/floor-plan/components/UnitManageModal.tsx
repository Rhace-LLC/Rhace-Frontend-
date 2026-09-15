import { useMemo } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { LogIn, LogOut } from 'lucide-react';
import {
  useCheckInUnitReservation,
  useCheckOutUnitReservation,
  usePhysicalUnit,
  useTransitionUnitStatus,
  useUnitReservations,
} from '../api/hooks';
import { stateMetaFor } from '../domain/states';
import { nextStates } from '../domain/transitions';
import { isLocked } from '../domain/reservations';
import type { InventoryBlueprint, Vertical } from '../domain/types';
import { formatBlueprintPricing, getBlueprintPricing } from '../domain/pricing';
import type { UnitReservationDto } from '@/types';

interface UnitManageModalProps {
  unitId: string | null;
  vertical: Vertical;
  blueprints: InventoryBlueprint[];
  onClose: () => void;
}

function formatWindow(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} → ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function UnitManageModal({ unitId, vertical, blueprints, onClose }: UnitManageModalProps) {
  const unitQuery = usePhysicalUnit(unitId ?? undefined);
  const reservationsQuery = useUnitReservations(unitId ? { unitId, limit: 50 } : undefined);
  const transition = useTransitionUnitStatus();
  const checkIn = useCheckInUnitReservation();
  const checkOut = useCheckOutUnitReservation();

  const unit = unitQuery.data?.unit;
  const blueprint = unit ? blueprints.find((b) => b.id === unit.blueprint) : undefined;
  const reservations = useMemo<UnitReservationDto[]>(
    () =>
      (reservationsQuery.data?.items ?? [])
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start)),
    [reservationsQuery.data]
  );
  const activeReservation =
    reservations.find((r) => r.status === 'active') ??
    reservations.find((r) => r.status === 'upcoming');

  if (!unitId) return null;

  const meta = unit ? stateMetaFor(vertical, unit.state) : undefined;
  const locked = unit ? isLocked(unit._id) : false;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={unit ? unit.label : 'Unit'}
      subtitle={blueprint?.name ?? 'Physical unit'}
      footer={
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      }
    >
      {!unit ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading unit…</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${meta?.color}22`, color: meta?.color }}
            >
              {meta?.label}
            </span>
            {locked && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                locked
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-xs">
            <dt className="text-gray-500">Blueprint</dt>
            <dd className="text-gray-900">{blueprint?.name ?? '—'}</dd>
            <dt className="text-gray-500">Floor</dt>
            <dd className="text-gray-900">{unit.floorId || '—'}</dd>
            <dt className="text-gray-500">Section</dt>
            <dd className="text-gray-900">{unit.sectionId || '—'}</dd>
            <dt className="text-gray-500">Capacity</dt>
            <dd className="text-gray-900">{blueprint?.capacity ?? '—'}</dd>
            <dt className="text-gray-500">Price</dt>
            <dd className="text-gray-900">
              {blueprint ? formatBlueprintPricing(getBlueprintPricing(blueprint)) : '—'}
            </dd>
            <dt className="text-gray-500">Reservable</dt>
            <dd className="text-gray-900">{unit.isReservable === false ? 'No' : 'Yes'}</dd>
          </dl>

          {/* Status transitions */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">Operational status</p>
            <div className="flex flex-wrap gap-2">
              {nextStates(vertical, unit.state).map((target) => (
                <button
                  key={target}
                  disabled={transition.isPending}
                  onClick={() =>
                    transition.mutate({ unitId: unit._id, input: { to: target } })
                  }
                  className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  {stateMetaFor(vertical, target).label}
                </button>
              ))}
            </div>
          </div>

          {/* Active reservation */}
          {activeReservation && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Active / next reservation</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 capitalize">
                  {activeReservation.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-gray-500">Guest</span>
                <span className="text-gray-900">{activeReservation.guestName}</span>
                <span className="text-gray-500">Party</span>
                <span className="text-gray-900">{activeReservation.partySize ?? '—'}</span>
                <span className="text-gray-500">Window</span>
                <span className="text-gray-900">
                  {formatWindow(activeReservation.start, activeReservation.end)}
                </span>
                {vertical === 'restaurant' && (
                  <>
                    <span className="text-gray-500">Order / spend</span>
                    <span className="text-gray-900">
                      ${(activeReservation.posSpend ?? 0).toLocaleString()}
                      {activeReservation.notes ? ` · ${activeReservation.notes}` : ''}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {activeReservation.status === 'upcoming' && (
                  <button
                    onClick={() => checkIn.mutate(activeReservation._id)}
                    disabled={checkIn.isPending}
                    className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    <LogIn size={12} /> Check in
                  </button>
                )}
                {activeReservation.status === 'active' && (
                  <button
                    onClick={() => checkOut.mutate(activeReservation._id)}
                    disabled={checkOut.isPending}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <LogOut size={12} /> Check out
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reservations calendar / list */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">
              Reservations ({reservations.length})
            </p>
            {reservations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
                No reservations for this unit.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {reservations.map((dto) => (
                  <li
                    key={dto._id}
                    className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1.5 text-xs"
                  >
                    <span className="text-gray-800">{dto.guestName}</span>
                    <span className="text-gray-500">{formatWindow(dto.start, dto.end)}</span>
                    <span className="capitalize text-gray-500">{dto.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
