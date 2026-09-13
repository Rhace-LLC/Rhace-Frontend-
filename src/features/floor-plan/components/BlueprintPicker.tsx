import { useState } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { allBlueprints, createCustomBlueprint, saveCustomBlueprint } from '../domain/blueprintStore';
import type { InventoryBlueprint, Vertical } from '../domain/types';

interface BlueprintPickerProps {
  vertical: Vertical;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (blueprint: InventoryBlueprint) => void;
}

const inputClass = 'rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800';

export function BlueprintPicker({ vertical, isOpen, onClose, onSelect }: BlueprintPickerProps) {
  const [blueprints, setBlueprints] = useState<InventoryBlueprint[]>(() => allBlueprints(vertical));
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCapacity, setCustomCapacity] = useState('2');

  const createCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const blueprint = createCustomBlueprint(vertical, {
      name,
      type: name,
      basePrice: Number(customPrice) || 0,
      capacity: Number(customCapacity) || 2,
    });
    saveCustomBlueprint(blueprint);
    setBlueprints(allBlueprints(vertical));
    setCustomName('');
    setCustomPrice('');
    setCustomCapacity('2');
    onSelect(blueprint);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a blueprint"
      subtitle="Pick a blueprint for this unit, or create a custom one."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {blueprints.map((blueprint) => (
            <button
              key={blueprint.id}
              onClick={() => onSelect(blueprint)}
              className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-teal-500 hover:bg-teal-50"
            >
              <span className="text-sm font-medium text-gray-900">{blueprint.name}</span>
              <span className="text-xs text-gray-500">
                {blueprint.type} · capacity {blueprint.capacity}
              </span>
              <span className="text-xs font-semibold text-gray-900">
                ${blueprint.basePrice.toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Create custom blueprint</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name (e.g. Owner's Suite)"
              className={inputClass}
            />
            <input
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              type="number"
              placeholder="Price"
              className={`${inputClass} w-24`}
            />
            <input
              value={customCapacity}
              onChange={(e) => setCustomCapacity(e.target.value)}
              type="number"
              placeholder="Capacity"
              className={`${inputClass} w-24`}
            />
            <button
              onClick={createCustom}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
            >
              Create &amp; use
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
