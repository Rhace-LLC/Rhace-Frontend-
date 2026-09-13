import { Redo2, RotateCcw, Undo2 } from 'lucide-react';
import type { BusinessData, CanvasMode, FloorEntity, FloorPlan, SpatialData } from '../core/types';
import type { ToolbarItem, VerticalPlugin } from '../core/plugin';
import { ModeSwitcher } from '../core/ModeSwitcher';

interface FloorPlanToolbarProps {
  plan: FloorPlan;
  plugin: VerticalPlugin;
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  onFit: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setPlanMeta: (meta: Partial<FloorPlan>) => void;
  addEntity: (entity: FloorEntity) => void;
  onMutate: (updater: (plan: FloorPlan) => FloorPlan) => void;
  onAddSection: (name: string) => void;
  onDeleteSection: (name: string) => void;
  onAddFloor: (section: string, name: string) => void;
  onDeleteFloor: (section: string, floor: string) => void;
  updateEntity: (
    id: string,
    patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }
  ) => void;
  activeOverlays: string[];
  toggleOverlay: (id: string) => void;
  manageItems: ToolbarItem[];
}

export function FloorPlanToolbar({
  plan,
  plugin,
  mode,
  onModeChange,
  onFit,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  setPlanMeta,
  addEntity,
  onMutate,
  onAddSection,
  onDeleteSection,
  onAddFloor,
  onDeleteFloor,
  updateEntity,
  activeOverlays,
  toggleOverlay,
  manageItems,
}: FloorPlanToolbarProps) {
  return (
    <div className="z-30 border-b border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{plan.name}</h1>
            <p className="text-xs capitalize text-gray-500">
              {plugin.label} · {plan.entities.length} objects · {plan.floor ?? ''}
            </p>
          </div>
          {plugin.renderTopBar && (
            <div className="ml-2 border-l border-gray-200 pl-3">
              {plugin.renderTopBar({
                plan,
                mode,
                setPlanMeta,
                mutate: onMutate,
                addEntity,
                updateEntity,
                addSection: onAddSection,
                deleteSection: onDeleteSection,
                addFloor: onAddFloor,
                deleteFloor: onDeleteFloor,
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(plugin.overlays ?? []).map((overlay) => (
            <button
              key={overlay.id}
              onClick={() => toggleOverlay(overlay.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeOverlays.includes(overlay.id)
                  ? 'bg-teal-700 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {overlay.label}
            </button>
          ))}
          <ModeSwitcher mode={mode} onChange={onModeChange} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-2">
        {mode === 'edit' ? (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              <Redo2 size={14} /> Redo
            </button>
            <span className="ml-auto hidden text-xs text-gray-400 md:block">
              Drag to move · drag edges to resize · select to edit/delete
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500">
              Click an object to open its operational panel.
            </span>
            {manageItems.length > 0 && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                {manageItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={onFit}
                className="rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Fit
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                <RotateCcw size={14} /> Reset prototype
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
