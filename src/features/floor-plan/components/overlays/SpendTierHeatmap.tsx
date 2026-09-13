import type { FloorPlan } from '../../core/types';

export function SpendTierHeatmap({ plan }: { plan: FloorPlan }) {
  const vips = plan.entities.filter((e) => e.businessData.minimumSpend);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {vips.map((entity) => {
        const { x, y, width, height } = entity.spatialData;
        const tier = String(entity.businessData.tier || 'Perimeter');
        const prime = tier === 'Prime Stage View';
        return (
          <div
            key={entity.entityId}
            className="absolute rounded-2xl border-2"
            style={{
              left: x - 10,
              top: y - 10,
              width: width + 20,
              height: height + 20,
              borderColor: prime ? 'rgba(234,179,8,0.95)' : 'rgba(59,130,246,0.9)',
              boxShadow: prime ? '0 0 26px rgba(234,179,8,0.35)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
