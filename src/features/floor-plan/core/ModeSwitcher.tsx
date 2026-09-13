import type { CanvasMode } from './types';

interface ModeSwitcherProps {
  mode: CanvasMode;
  onChange: (mode: CanvasMode) => void;
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {(['edit', 'manage'] as CanvasMode[]).map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === value ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {value === 'edit' ? 'Edit Mode' : 'Manage Mode'}
        </button>
      ))}
    </div>
  );
}
