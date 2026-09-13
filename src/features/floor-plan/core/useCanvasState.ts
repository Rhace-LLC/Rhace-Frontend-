import { useCallback, useState } from 'react';
import type { CanvasMode, Viewport } from './types';

export interface CanvasLayers {
  structure: boolean;
  entities: boolean;
  overlays: boolean;
}

export interface CanvasGrid {
  size: number;
  visible: boolean;
}

export function useCanvasState(initialMode: CanvasMode = 'manage') {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [grid, setGrid] = useState<CanvasGrid>({ size: 20, visible: true });
  const [snap, setSnap] = useState(true);
  const [layers, setLayers] = useState<CanvasLayers>({
    structure: true,
    entities: true,
    overlays: true,
  });
  const [selection, setSelection] = useState<string[]>([]);
  const [mode, setMode] = useState<CanvasMode>(initialMode);
  const [panTool, setPanTool] = useState(false);

  const togglePanTool = useCallback(() => setPanTool((p) => !p), []);

  const toggleSnap = useCallback(() => setSnap((s) => !s), []);
  const toggleGrid = useCallback(
    () => setGrid((g) => ({ ...g, visible: !g.visible })),
    []
  );
  const setGridSize = useCallback(
    (size: number) => setGrid((g) => ({ ...g, size: Math.max(5, size) })),
    []
  );
  const toggleLayer = useCallback(
    (key: keyof CanvasLayers) => setLayers((l) => ({ ...l, [key]: !l[key] })),
    []
  );

  const select = useCallback((id: string | null) => {
    setSelection(id ? [id] : []);
  }, []);
  const toggleSelect = useCallback((id: string) => {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);
  const clearSelection = useCallback(() => setSelection([]), []);

  const zoomAt = useCallback(
    (point: { x: number; y: number }, factor: number, min = 0.25, max = 3) => {
      setViewport((v) => {
        const scale = Math.min(max, Math.max(min, v.scale * factor));
        const k = scale / v.scale;
        return {
          scale,
          x: point.x - (point.x - v.x) * k,
          y: point.y - (point.y - v.y) * k,
        };
      });
    },
    []
  );

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  const zoomBy = useCallback(
    (factor: number, viewSize?: { width: number; height: number }) => {
      const center = viewSize
        ? { x: viewSize.width / 2, y: viewSize.height / 2 }
        : { x: 0, y: 0 };
      zoomAt(center, factor);
    },
    [zoomAt]
  );

  const fit = useCallback(
    (planWidth: number, planHeight: number, viewWidth: number, viewHeight: number) => {
      const scale = Math.min(viewWidth / planWidth, viewHeight / planHeight) * 0.92;
      setViewport({
        scale,
        x: (viewWidth - planWidth * scale) / 2,
        y: (viewHeight - planHeight * scale) / 2,
      });
    },
    []
  );

  const setScale = useCallback((scale: number, viewSize?: { width: number; height: number }) => {
    setViewport((v) => {
      const clamped = Math.min(3, Math.max(0.25, scale));
      const k = clamped / v.scale;
      const cx = viewSize ? viewSize.width / 2 : 0;
      const cy = viewSize ? viewSize.height / 2 : 0;
      return { scale: clamped, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  return {
    viewport,
    setViewport,
    grid,
    setGrid,
    snap,
    setSnap,
    layers,
    toggleLayer,
    selection,
    setSelection,
    mode,
    setMode,
    panTool,
    togglePanTool,
    toggleSnap,
    toggleGrid,
    setGridSize,
    select,
    toggleSelect,
    clearSelection,
    zoomAt,
    zoomBy,
    panBy,
    fit,
    setScale,
  };
}

export type CanvasState = ReturnType<typeof useCanvasState>;
