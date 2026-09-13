import { useEffect, useState } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { CATEGORY_OBJECTS } from '../domain/adapter';
import { stateOptions } from '../domain/states';
import type { InventoryBlueprint, UnitState, Vertical } from '../domain/types';

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

const inputClass =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-teal-500 focus:outline-none';

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
      title="Add Physical Unit to Canvas"
      subtitle="Link this canvas node to a blueprint template."
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePlace}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
          >
            Place Unit
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Unit Designation / Number
          </span>
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Room 402 · VIP Table V03 · Table T12"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Assign Inventory Blueprint</span>
          <select value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} className={inputClass}>
            {blueprints.map((blueprint) => (
              <option key={blueprint.id} value={blueprint.id}>
                {blueprint.name} (${blueprint.basePrice.toLocaleString()} · {blueprint.capacity} guests)
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Floor Level</span>
            <select value={floor} onChange={(e) => setFloor(e.target.value)} className={inputClass}>
              {floors.length === 0 && <option value="">Default</option>}
              {floors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Section / Zone</span>
            <select value={section} onChange={(e) => setSection(e.target.value)} className={inputClass}>
              {sections.length === 0 && <option value="">Unassigned</option>}
              {sections.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Initial Operational State</span>
          <select value={state} onChange={(e) => setState(e.target.value as UnitState)} className={inputClass}>
            {stateOptions(vertical).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Canvas dimensions (inherited from blueprint): {width}px × {height}px
        </div>
      </div>
    </Modal>
  );
}
