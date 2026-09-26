import { useEffect, useState } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { CATEGORY_OBJECTS } from '../domain/adapter';
import { stateOptions } from '../domain/states';
import type { InventoryBlueprint, UnitState, Vertical } from '../domain/types';
import { formatBlueprintPricing, getBlueprintPricing } from '../domain/pricing';

export interface UnitPlacementInput {
  designation: string;
  blueprintId: string;
  floor: string;
  section: string;
  state: UnitState;
}

interface AddPhysicalUnitModalProps {
  vertical: Vertical;
  isOpen: boolean;
  blueprints: InventoryBlueprint[];
  floors: string[];
  sections: string[];
  defaultBlueprintId?: string;
  defaultFloor?: string;
  defaultSection?: string;
  defaultState?: UnitState;
  suggestedName?: string;
  onClose: () => void;
  onPlace: (input: UnitPlacementInput) => void;
}

const KIND_LABEL: Record<Vertical, string> = {
  hotel: 'Room',
  club: 'Table',
  restaurant: 'Table',
};

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

export function AddPhysicalUnitModal({
  vertical,
  isOpen,
  blueprints,
  floors,
  sections,
  defaultBlueprintId,
  defaultFloor,
  defaultSection,
  defaultState,
  suggestedName,
  onClose,
  onPlace,
}: AddPhysicalUnitModalProps) {
  const object = CATEGORY_OBJECTS[vertical];
  const kind = KIND_LABEL[vertical];
  const [designation, setDesignation] = useState('');
  const [blueprintId, setBlueprintId] = useState('');
  const [floor, setFloor] = useState('');
  const [section, setSection] = useState('');
  const [state, setState] = useState<UnitState>(defaultState ?? stateOptions(vertical)[0].value as UnitState);

  useEffect(() => {
    if (!isOpen) return;
    setDesignation(suggestedName ?? '');
    // Only accept a default blueprint that actually exists in the current
    // (API) catalog — guards against a stale localStorage "last blueprint" id.
    const resolvedDefault =
      defaultBlueprintId && blueprints.some((b) => b.id === defaultBlueprintId)
        ? defaultBlueprintId
        : blueprints[0]?.id ?? '';
    setBlueprintId(resolvedDefault);
    setFloor(defaultFloor ?? floors[0] ?? '');
    setSection(defaultSection ?? sections[0] ?? '');
    setState(defaultState ?? (stateOptions(vertical)[0].value as UnitState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultBlueprintId, defaultFloor, defaultSection, suggestedName, vertical, blueprints]);

  const selected = blueprints.find((b) => b.id === blueprintId);
  const width = selected?.canvasWidth ?? object.width;
  const height = selected?.canvasHeight ?? object.height;

  const handlePlace = () => {
    if (!blueprintId) return;
    onPlace({ designation: designation.trim(), blueprintId, floor, section, state });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${kind.toLowerCase()}`}
      subtitle={`Place it on the floor map${selected ? ` as a ${selected.name}` : ''}.`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePlace}
            disabled={!blueprintId}
            className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Place {kind.toLowerCase()}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="place-name">
            Name
          </label>
          <input
            id="place-name"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder={vertical === 'hotel' ? 'Room 402' : 'Table T12'}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="place-type">
            Type
          </label>
          <select
            id="place-type"
            value={blueprintId}
            onChange={(e) => setBlueprintId(e.target.value)}
            className={inputClass}
          >
            {blueprints.map((blueprint) => (
              <option key={blueprint.id} value={blueprint.id}>
                {blueprint.name} ({formatBlueprintPricing(getBlueprintPricing(blueprint))} · {blueprint.capacity} guests)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="place-floor">
              Floor
            </label>
            <select
              id="place-floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className={inputClass}
            >
              {floors.length === 0 && <option value="">Default</option>}
              {floors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="place-section">
              Section
            </label>
            <select
              id="place-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className={inputClass}
            >
              {sections.length === 0 && <option value="">Unassigned</option>}
              {sections.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="place-status">
            Starting status
          </label>
          <select
            id="place-status"
            value={state}
            onChange={(e) => setState(e.target.value as UnitState)}
            className={inputClass}
          >
            {stateOptions(vertical).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="type-res-small rounded-res-md bg-res-surface px-4 py-3 font-normal text-res-ink-muted">
          Map size comes from the type: {width}px × {height}px.
        </p>
      </div>
    </Modal>
  );
}
