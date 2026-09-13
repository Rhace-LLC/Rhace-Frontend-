import { Copy, RotateCw, Trash2, X } from 'lucide-react';
import type { BusinessData, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { InventoryBlueprint } from '../domain/types';

interface EntityPatch {
  businessData?: Partial<BusinessData>;
  spatialData?: Partial<SpatialData>;
}

interface PropertiesPanelProps {
  plan: FloorPlan;
  selection: string[];
  blueprint?: InventoryBlueprint | null;
  onEditBlueprint?: () => void;
  onUpdate: (id: string, patch: EntityPatch) => void;
  onUpdateMany: (ids: string[], patchFn: (entity: FloorEntity) => EntityPatch) => void;
  onDuplicate: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}

const SHAPES: SpatialData['shape'][] = ['rect', 'square', 'rectangle', 'round', 'oval', 'booth', 'cabana', 'room', 'bar-seat'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  'rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-teal-500 focus:outline-none';

export function PropertiesPanel({
  plan,
  selection,
  blueprint,
  onEditBlueprint,
  onUpdate,
  onUpdateMany,
  onDuplicate,
  onDelete,
  onClose,
}: PropertiesPanelProps) {
  const single = selection.length === 1 ? plan.entities.find((e) => e.entityId === selection[0]) : undefined;

  if (selection.length === 0) return null;

  if (!single) {
    return (
      <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{selection.length} selected</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </header>
        <div className="space-y-4 p-4">
          <p className="text-xs text-gray-500">Bulk actions</p>
          <Field label="Set status">
            <select
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                onUpdateMany(selection, () => ({ businessData: { status: value } }));
                e.target.value = '';
              }}
              className={inputClass}
            >
              <option value="">Choose status…</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
              <option value="blocked">Blocked</option>
            </select>
          </Field>
          <div className="flex gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={() => onDuplicate(selection)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={() => onDelete(selection)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const s = single.spatialData;
  const b = single.businessData;
  const set = (patch: EntityPatch) => onUpdate(single.entityId, patch);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <p className="truncate text-sm font-semibold text-gray-900">{b.name}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <Field label="Name">
          <input
            value={String(b.name ?? '')}
            onChange={(e) => set({ businessData: { name: e.target.value } })}
            className={inputClass}
          />
        </Field>

        <Field label="Area">
          <input
            value={String(b.area ?? '')}
            onChange={(e) => set({ businessData: { area: e.target.value } })}
            placeholder="e.g. Main Dining Area"
            className={inputClass}
          />
        </Field>

        <Field label="Shape">
          <select
            value={s.shape}
            onChange={(e) => set({ spatialData: { shape: e.target.value as SpatialData['shape'] } })}
            className={inputClass}
          >
            {SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity">
            <input
              type="number"
              min={1}
              value={Number(b.capacity ?? 0)}
              onChange={(e) => set({ businessData: { capacity: Math.max(1, Number(e.target.value)) } })}
              className={inputClass}
            />
          </Field>
          <Field label="Max capacity">
            <input
              type="number"
              min={1}
              value={Number(b.maxCapacity ?? b.capacity ?? 0)}
              onChange={(e) => set({ businessData: { maxCapacity: Math.max(1, Number(e.target.value)) } })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Rotation">
          <div className="flex items-center gap-2">
            <select
              value={String(s.rotation)}
              onChange={(e) => set({ spatialData: { rotation: Number(e.target.value) } })}
              className={inputClass}
            >
              {[0, 90, 180, 270].map((r) => (
                <option key={r} value={r}>
                  {r}°
                </option>
              ))}
            </select>
            <button
              title="Rotate 90°"
              onClick={() => set({ spatialData: { rotation: (s.rotation + 90) % 360 } })}
              className="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="X">
            <input type="number" value={Math.round(s.x)} onChange={(e) => set({ spatialData: { x: Number(e.target.value) } })} className={inputClass} />
          </Field>
          <Field label="Y">
            <input type="number" value={Math.round(s.y)} onChange={(e) => set({ spatialData: { y: Number(e.target.value) } })} className={inputClass} />
          </Field>
          <Field label="Width">
            <input type="number" value={Math.round(s.width)} onChange={(e) => set({ spatialData: { width: Math.max(40, Number(e.target.value)) } })} className={inputClass} />
          </Field>
          <Field label="Height">
            <input type="number" value={Math.round(s.height)} onChange={(e) => set({ spatialData: { height: Math.max(40, Number(e.target.value)) } })} className={inputClass} />
          </Field>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={b.isReservable !== false}
            onChange={(e) => set({ businessData: { isReservable: e.target.checked } })}
          />
          Available for booking
        </label>

        {onEditBlueprint && blueprint && (
          <button
            onClick={onEditBlueprint}
            className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100"
          >
            Edit Blueprint · {blueprint.name}
          </button>
        )}
      </div>

      <div className="mt-auto flex gap-2 border-t border-gray-200 p-4">
        <button
          onClick={() => onDuplicate([single.entityId])}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Copy size={14} /> Duplicate
        </button>
        <button
          onClick={() => onDelete([single.entityId])}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </aside>
  );
}
