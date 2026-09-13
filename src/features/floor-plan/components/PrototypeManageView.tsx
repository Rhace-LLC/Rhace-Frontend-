import { Link } from 'react-router-dom';
import { ExternalLink, RotateCcw } from 'lucide-react';
import type { VerticalPlugin } from '../core/plugin';
import { useFloorPlanStore } from '../mock/mockStore';

interface PrototypeManageViewProps {
  plugin: VerticalPlugin;
  floorPlanPath: string;
  description: string;
}

export function PrototypeManageView({ plugin, floorPlanPath, description }: PrototypeManageViewProps) {
  const store = useFloorPlanStore(plugin.id);
  const filtered = plugin.filterEntities
    ? plugin.filterEntities(store.plan, store.plan.entities)
    : store.plan.entities;
  const items = filtered.filter(
    (e) => e.spatialData.layer !== 'structure' && e.spatialData.layer !== 'area'
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {plugin.label} — Prototype Manager
              </h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                MOCK DATA
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={store.resetDraft}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <Link
              to={floorPlanPath}
              className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"
            >
              Open floor plan <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {plugin.renderManageHeader && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3">
            {plugin.renderManageHeader({
              plan: store.plan,
              mode: 'manage',
              setPlanMeta: store.setPlanMeta,
              mutate: store.mutate,
              addSection: store.addSection,
              deleteSection: store.deleteSection,
              addFloor: store.addFloor,
              deleteFloor: store.deleteFloor,
              addEntity: store.addEntity,
              updateEntity: (id, patch) => store.updateEntity(id, patch),
            })}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center text-sm text-gray-500">
            No entities on this floor.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((entity) => (
              <div key={entity.entityId} className="min-h-[10rem]">
                {plugin.renderManageCard ? (
                  plugin.renderManageCard(entity)
                ) : (
                  <div className="h-40 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    {plugin.renderTile(entity, {
                      mode: 'manage',
                      selected: false,
                      vertical: plugin.id,
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
