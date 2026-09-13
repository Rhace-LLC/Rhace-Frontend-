import type { ReactNode } from 'react';
import { Grid3x3, Hand, Layers, Magnet, Maximize, Minus, Plus } from 'lucide-react';
import type { CanvasState } from './useCanvasState';

interface CanvasControlsProps {
  canvas: CanvasState;
  onFit: () => void;
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
        active ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export function CanvasControls({ canvas, onFit }: CanvasControlsProps) {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-gray-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur">
      <button
        title="Zoom out"
        onClick={() => canvas.zoomBy(0.9)}
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
      >
        <Minus size={16} />
      </button>
      <span className="w-12 text-center text-xs font-medium text-gray-700">
        {Math.round(canvas.viewport.scale * 100)}%
      </span>
      <button
        title="Zoom in"
        onClick={() => canvas.zoomBy(1.1)}
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
      >
        <Plus size={16} />
      </button>

      <div className="mx-1 h-5 w-px bg-gray-200" />

      <button
        title="Fit screen"
        onClick={onFit}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        <Maximize size={14} /> Fit
      </button>
      <ToggleButton active={canvas.panTool} onClick={canvas.togglePanTool} title="Pan tool (or hold Space / Alt)">
        <Hand size={14} /> Pan
      </ToggleButton>
      <ToggleButton active={canvas.snap} onClick={canvas.toggleSnap} title="Snap to grid">
        <Magnet size={14} /> Snap
      </ToggleButton>
      <ToggleButton active={canvas.grid.visible} onClick={canvas.toggleGrid} title="Toggle grid">
        <Grid3x3 size={14} /> Grid
      </ToggleButton>

      <div className="mx-1 h-5 w-px bg-gray-200" />

      <div className="flex items-center gap-0.5 rounded-md px-1 text-gray-500">
        <Layers size={14} />
        <ToggleButton
          active={canvas.layers.structure}
          onClick={() => canvas.toggleLayer('structure')}
          title="Structure layer"
        >
          S
        </ToggleButton>
        <ToggleButton
          active={canvas.layers.entities}
          onClick={() => canvas.toggleLayer('entities')}
          title="Entities layer"
        >
          E
        </ToggleButton>
        <ToggleButton
          active={canvas.layers.overlays}
          onClick={() => canvas.toggleLayer('overlays')}
          title="Overlays layer"
        >
          O
        </ToggleButton>
      </div>
    </div>
  );
}
