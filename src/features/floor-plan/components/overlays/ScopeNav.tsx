import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CanvasMode } from '../../core/types';

interface ScopeNavProps {
  mode?: CanvasMode;
  areaLabel?: string;
  areaOptions?: string[];
  activeArea?: string;
  onSelectArea?: (value: string) => void;
  onAddArea?: (name: string) => void;
  onDeleteArea?: () => void;
  floorOptions: string[];
  activeFloor: string;
  onSelectFloor: (value: string) => void;
  onAddFloor?: (name: string) => void;
  onDeleteFloor?: () => void;
}

const inputClass = 'rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800';

function AddInput({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };
  return (
    <div className="flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder={placeholder}
        className={inputClass}
      />
      <button
        type="button"
        onClick={submit}
        title={`Add ${placeholder.toLowerCase()}`}
        className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function DeleteControl({
  title,
  disabled,
  onClick,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-red-200 bg-white p-1 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 size={14} />
    </button>
  );
}

export function ScopeNav({
  mode,
  areaLabel,
  areaOptions = [],
  activeArea,
  onSelectArea,
  onAddArea,
  onDeleteArea,
  floorOptions,
  activeFloor,
  onSelectFloor,
  onAddFloor,
  onDeleteFloor,
}: ScopeNavProps) {
  const editing = mode === 'edit';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {areaLabel && (
        <div className="flex flex-wrap items-center gap-1">
          <label className="flex items-center gap-2 text-xs text-gray-500">
            {areaLabel}
            <select
              value={activeArea ?? areaOptions[0] ?? ''}
              onChange={(e) => onSelectArea?.(e.target.value)}
              className={inputClass}
            >
              {areaOptions.length === 0 && <option value="">No {areaLabel.toLowerCase()}</option>}
              {areaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {editing && onAddArea && (
            <AddInput placeholder={`New ${areaLabel.toLowerCase()}`} onAdd={onAddArea} />
          )}
          {editing && onDeleteArea && (
            <DeleteControl
              title={`Delete ${areaLabel.toLowerCase()}`}
              disabled={areaOptions.length <= 1}
              onClick={onDeleteArea}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Floor
          <select
            value={activeFloor}
            onChange={(e) => onSelectFloor(e.target.value)}
            className={inputClass}
          >
            {/* Empty state: legacy plans can have no floors recorded. Without
                this the select renders zero options and looks broken. */}
            {floorOptions.length === 0 && <option value="">No floors yet</option>}
            {/* Self-heal: show the active value even when it is not in the
                list (e.g. restored plan with a stale floor string), otherwise
                React renders the select with no visible selection. */}
            {activeFloor && !floorOptions.includes(activeFloor) && (
              <option value={activeFloor}>{activeFloor}</option>
            )}
            {floorOptions.map((floor) => (
              <option key={floor} value={floor}>
                {floor}
              </option>
            ))}
          </select>
        </label>
        {editing && onAddFloor && <AddInput placeholder="New floor" onAdd={onAddFloor} />}
        {editing && onDeleteFloor && (
          <DeleteControl
            title="Delete floor"
            disabled={floorOptions.length <= 1}
            onClick={onDeleteFloor}
          />
        )}
      </div>
    </div>
  );
}
