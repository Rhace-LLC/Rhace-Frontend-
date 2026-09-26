import { Circle, DoorOpen, Minus, PanelTop, Plus, RectangleHorizontal, Sofa, Square } from 'lucide-react';
import type { EntityTypeDefinition, VerticalPlugin } from '../core/plugin';

interface ElementsPanelProps {
  plugin: VerticalPlugin;
  disabled?: boolean;
  onAddEntity: (type: EntityTypeDefinition) => void;
  onAddCustom: (name: string) => void;
  onCreateBlueprint?: () => void;
}

const SHAPE_ICON: Record<string, typeof Circle> = {
  round: Circle,
  square: Square,
  rectangle: RectangleHorizontal,
  rect: RectangleHorizontal,
  oval: Circle,
  booth: Sofa,
  cabana: Sofa,
  'bar-seat': Circle,
  room: Square,
};

function iconFor(type: string) {
  return SHAPE_ICON[type] ?? (type === 'wall' ? Minus : type.includes('door') || type.includes('entrance') ? DoorOpen : PanelTop);
}

export function ElementsPanel({ plugin, disabled, onAddEntity, onAddCustom, onCreateBlueprint }: ElementsPanelProps) {
  const objects = plugin.entityTypes.filter((t) => !t.structure);
  const structures = plugin.entityTypes.filter((t) => t.structure);

  const renderItem = (type: EntityTypeDefinition) => {
    const Icon = iconFor(type.shape === 'rect' ? 'rectangle' : type.shape);
    return (
      <button
        key={type.type}
        type="button"
        draggable={!disabled}
        disabled={disabled}
        onDragStart={(e) => e.dataTransfer.setData('text/fp-kind', type.type)}
        onClick={() => onAddEntity(type)}
        className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon className="size-4 text-gray-400" />
        {type.label}
      </button>
    );
  };

  return (
    <div className="sticky top-0 flex max-h-[calc(100dvh-12rem)] w-[220px] shrink-0 self-start flex-col gap-6 overflow-y-auto border-r border-gray-200 bg-white px-4 py-5">
      {onCreateBlueprint && (
        <button
          type="button"
          disabled={disabled}
          onClick={onCreateBlueprint}
          className="flex items-center justify-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-40"
        >
          <Plus size={14} /> Create Blueprint
        </button>
      )}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Objects
        </p>
        <div className="flex flex-col gap-1">{objects.map(renderItem)}</div>
      </div>

      {structures.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            Structure
          </p>
          <div className="flex flex-col gap-1">{structures.map(renderItem)}</div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Custom
        </p>
        <CustomObjectInput disabled={disabled} onAddCustom={onAddCustom} />
      </div>

      <p className="mt-auto text-xs leading-relaxed text-gray-400">
        Drag an item onto the canvas, or click to drop it in the centre.
      </p>
    </div>
  );
}

function CustomObjectInput({
  disabled,
  onAddCustom,
}: {
  disabled?: boolean;
  onAddCustom: (name: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        disabled={disabled}
        placeholder="Custom name…"
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const value = (e.target as HTMLInputElement).value.trim();
          if (!value) return;
          onAddCustom(value);
          (e.target as HTMLInputElement).value = '';
        }}
        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 disabled:opacity-40"
      />
      <button
        type="button"
        disabled={disabled}
        title="Add custom object"
        onClick={(e) => {
          const input = (e.currentTarget.previousElementSibling as HTMLInputElement) ?? null;
          const value = input?.value.trim();
          if (!value) return;
          onAddCustom(value);
          if (input) input.value = '';
        }}
        className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
