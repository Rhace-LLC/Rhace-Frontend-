import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { EntityShape, FloorEntity } from '../core/types';

interface EntityNodeProps {
  entity: FloorEntity;
  selected: boolean;
  children: ReactNode;
  onPointerDown?: (event: ReactPointerEvent, entityId: string) => void;
  onDoubleClick?: (entityId: string) => void;
  onContextMenu?: (event: ReactPointerEvent, entityId: string) => void;
  styleExtra?: CSSProperties;
  zIndex?: number;
}

function shapeStyle(shape: EntityShape): CSSProperties {
  switch (shape) {
    case 'round':
    case 'bar-seat':
      return { borderRadius: '9999px' };
    case 'oval':
      return { borderRadius: '50%' };
    case 'booth':
    case 'cabana':
      return { borderRadius: 12 };
    case 'room':
      return { borderRadius: 6 };
    case 'square':
    case 'rectangle':
    case 'rect':
    default:
      return { borderRadius: 8 };
  }
}

export function EntityNode({
  entity,
  selected,
  children,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
  styleExtra,
  zIndex = 10,
}: EntityNodeProps) {
  const { x, y, width, height, rotation, shape } = entity.spatialData;

  return (
    <div
      data-entity-id={entity.entityId}
      onPointerDown={(event) => onPointerDown?.(event, entity.entityId)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.(entity.entityId);
      }}
      onContextMenu={(event) => {
        if (!onContextMenu) return;
        event.preventDefault();
        onContextMenu(event as unknown as ReactPointerEvent, entity.entityId);
      }}
      className="absolute select-none overflow-hidden"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex: selected ? zIndex + 20 : zIndex,
        transform: `rotate(${rotation}deg)`,
        ...shapeStyle(shape),
        ...styleExtra,
      }}
    >
      {children}
    </div>
  );
}
