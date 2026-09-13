import type { FloorPlan } from '../../core/types';

const PALETTE = [
  'rgba(59,130,246,0.18)',
  'rgba(16,185,129,0.18)',
  'rgba(245,158,11,0.18)',
  'rgba(168,85,247,0.18)',
  'rgba(236,72,153,0.18)',
  'rgba(20,184,166,0.18)',
];

function hashIndex(value: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function SectionHeatmap({ plan }: { plan: FloorPlan }) {
  const tables = plan.entities.filter(
    (e) => (e.businessData.area || e.businessData.section) && e.spatialData.layer !== 'area'
  );
  return (
    <div className="absolute inset-0 pointer-events-none">
      {tables.map((entity) => {
        const area = String(entity.businessData.area ?? entity.businessData.section);
        const { x, y, width, height } = entity.spatialData;
        return (
          <div
            key={entity.entityId}
            className="absolute rounded-2xl"
            style={{
              left: x - 12,
              top: y - 12,
              width: width + 24,
              height: height + 24,
              background: PALETTE[hashIndex(area, PALETTE.length)],
            }}
          />
        );
      })}
    </div>
  );
}
