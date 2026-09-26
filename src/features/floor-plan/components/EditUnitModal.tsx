import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/others/RhaceModal';
import { useUpdateUnit } from '../api/hooks';
import type { PhysicalUnitDto } from '@/types';

interface EditUnitModalProps {
  unit: PhysicalUnitDto | null;
  kind: string;
  floors: string[];
  sections: string[];
  onClose: () => void;
}

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

export function EditUnitModal({ unit, kind, floors, sections, onClose }: EditUnitModalProps) {
  const update = useUpdateUnit();
  const [label, setLabel] = useState('');
  const [floorId, setFloorId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [reservable, setReservable] = useState(true);

  useEffect(() => {
    if (unit) {
      setLabel(unit.label ?? '');
      setFloorId(unit.floorId ?? '');
      setSectionId(unit.sectionId ?? '');
      setReservable(unit.isReservable !== false);
    }
  }, [unit]);

  if (!unit) return null;

  const handleSave = () => {
    if (!label.trim()) {
      toast.error('Give this one a name first.');
      return;
    }
    update.mutate(
      {
        unitId: unit._id,
        input: {
          label: label.trim(),
          floorId: floorId || undefined,
          sectionId: sectionId || undefined,
          isReservable: reservable,
        },
      },
      {
        onSuccess: () => {
          toast.success('Saved');
          onClose();
        },
        onError: () => toast.error('Could not save changes.'),
      }
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit ${kind} ${unit.label}`}
      subtitle="Rename it, move floors, or pause bookings."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={update.isPending}
            className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending}
            className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="edit-unit-label">
            Name
          </label>
          <input
            id="edit-unit-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. T3"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="edit-unit-floor">
              Floor
            </label>
            <select
              id="edit-unit-floor"
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              className={inputClass}
            >
              <option value="">No floor</option>
              {floors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-unit-section">
              Section
            </label>
            <select
              id="edit-unit-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className={inputClass}
            >
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={reservable}
          onClick={() => setReservable((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-res-md bg-res-surface px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
        >
          <span className="text-left">
            <span className="type-res-body block font-semibold text-res-ink">Open for booking</span>
            <span className="type-res-small block font-normal text-res-ink-muted">
              {reservable ? 'Guests can book this one.' : 'Hidden from guests for now.'}
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              reservable ? 'bg-res-brand' : 'bg-res-brand-disabled'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-res-card shadow transition-all ${
                reservable ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </div>
    </Modal>
  );
}
