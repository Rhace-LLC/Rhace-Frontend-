import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/others/RhaceModal';
import type { BusinessData, FloorEntity, SpatialData } from '../core/types';
import type { VerticalPlugin } from '../core/plugin';

interface OperationalDrawerProps {
  entity: FloorEntity;
  plugin: VerticalPlugin;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (patch: {
    businessData?: Partial<BusinessData>;
    spatialData?: Partial<SpatialData>;
  }) => void;
}

export function OperationalDrawer({
  entity,
  plugin,
  onClose,
  onDelete,
  onUpdate,
}: OperationalDrawerProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={entity.businessData.name}
      subtitle={entity.type.replace(/_/g, ' ')}
      footer={
        <>
          <button
            onClick={() => onDelete(entity.entityId)}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </>
      }
    >
      {plugin.renderDrawer(entity, {
        mode: 'manage',
        onUpdate,
        onClose,
      })}
    </Modal>
  );
}
