import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FloorEntity } from '../core/types';
import type { EntityTypeDefinition, VerticalPlugin } from '../core/plugin';
import { useCanvasState } from '../core/useCanvasState';
import type { FloorPlanStore } from '../core/store';
import { uid } from '../core/ids';
import { CanvasSurface } from '../core/CanvasSurface';
import { CanvasControls } from '../core/CanvasControls';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { OperationalDrawer } from './OperationalDrawer';
import { ElementsPanel } from './ElementsPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AddPhysicalUnitModal, type UnitPlacementInput } from './AddPhysicalUnitModal';
import { CreateBlueprintModal } from './CreateBlueprintModal';
import { CATEGORY_OBJECTS } from '../domain/adapter';
import { defaultStateFor } from '../domain/states';
import { isLocked } from '../domain/reservations';
import { allBlueprints, loadLastBlueprintId, saveLastBlueprintId } from '../domain/blueprintStore';
import { findBlueprint } from '../domain/blueprints';
import type { InventoryBlueprint, Reservation, Vertical } from '../domain/types';

interface FloorPlanWorkbenchProps {
  plugin: VerticalPlugin;
  store: FloorPlanStore;
  highlightUnitId?: string | null;
  onHighlightUnit?: (id: string | null) => void;
  reservations?: Reservation[];
  onReservationChange?: (reservation: Reservation) => void;
}

export function FloorPlanWorkbench({
  plugin,
  store,
  highlightUnitId,
  onHighlightUnit,
  reservations,
  onReservationChange,
}: FloorPlanWorkbenchProps) {
  const vertical = plugin.id as Vertical;
  const canvas = useCanvasState('edit');
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const [drawerEntityId, setDrawerEntityId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [pendingPlacement, setPendingPlacement] = useState<{
    type: EntityTypeDefinition;
    position?: { x: number; y: number };
  } | null>(null);
  const [blueprintModal, setBlueprintModal] = useState<{
    open: boolean;
    initial: InventoryBlueprint | null;
  }>({ open: false, initial: null });

  const { plan } = store;

  const toggleOverlay = useCallback((id: string) => {
    setActiveOverlays((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const drawerEntity = drawerEntityId
    ? plan.entities.find((e) => e.entityId === drawerEntityId) ?? null
    : null;

  const selectedEntity =
    canvas.selection.length === 1
      ? plan.entities.find((e) => e.entityId === canvas.selection[0]) ?? null
      : null;
  const selectedBlueprint = selectedEntity
    ? findBlueprint(allBlueprints(vertical), String(selectedEntity.businessData.blueprintId ?? ''))
    : undefined;

  const fit = useCallback(() => setFitSignal((s) => s + 1), []);

  const createEntity = useCallback(
    (type: EntityTypeDefinition, position?: { x: number; y: number }): FloorEntity => {
      const x = position ? Math.round(position.x - type.width / 2) : Math.round(plan.width / 2 - type.width / 2);
      const y = position ? Math.round(position.y - type.height / 2) : Math.round(plan.height / 2 - type.height / 2);
      const base: FloorEntity = {
        entityId: uid(type.type),
        type: type.type,
        businessData: { name: type.label },
        spatialData: {
          floorPlanId: plan.floorPlanId,
          x,
          y,
          width: type.width,
          height: type.height,
          rotation: 0,
          shape: type.shape,
          layer: type.structure ? 'structure' : 'entities',
          floor: plan.floor,
        },
      };
      return plugin.decorateNewEntity ? plugin.decorateNewEntity(base, plan) : base;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, plugin]
  );

  const handlePlaceUnit = useCallback(
    (input: UnitPlacementInput, position?: { x: number; y: number }) => {
      const blueprint = findBlueprint(allBlueprints(vertical), input.blueprintId);
      if (!blueprint) {
        window.alert('Please select a valid blueprint before placing the unit.');
        return;
      }
      const object = CATEGORY_OBJECTS[vertical];
      const width = blueprint?.canvasWidth ?? object.width;
      const height = blueprint?.canvasHeight ?? object.height;
      const anchor = position ?? pendingPlacement?.position;
      const x = anchor ? Math.round(anchor.x - width / 2) : Math.round(plan.width / 2 - width / 2);
      const y = anchor ? Math.round(anchor.y - height / 2) : Math.round(plan.height / 2 - height / 2);
      const count = plan.entities.filter((e) => e.businessData.blueprintId === input.blueprintId).length;
      const designation = input.designation || `${blueprint?.type ?? object.label} ${count + 1}`;

      const base: FloorEntity = {
        entityId: uid(object.type),
        type: object.type,
        businessData: {
          name: designation,
          status: input.state,
          blueprintId: input.blueprintId,
          capacity: blueprint?.capacity,
          maxCapacity: blueprint?.maxCapacity,
          area: input.section,
          isReservable: true,
        },
        spatialData: {
          floorPlanId: plan.floorPlanId,
          x,
          y,
          width,
          height,
          rotation: 0,
          shape: blueprint?.canvasShape ?? object.shape,
          layer: 'entities',
          floor: input.floor || plan.floor,
        },
      };
      store.addEntity(base);
      canvas.select(base.entityId);
      onHighlightUnit?.(base.entityId);
      setPendingPlacement(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [vertical, plan, pendingPlacement, store.addEntity, canvas.select, onHighlightUnit]
  );

  const handleAddEntity = useCallback(
    (type: EntityTypeDefinition) => {
      if (type.structure) {
        const entity = createEntity(type);
        store.addEntity(entity);
        canvas.select(entity.entityId);
        return;
      }
      setPendingPlacement({ type });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createEntity, store.addEntity, canvas.select]
  );

  const handleAddCustom = useCallback(
    (name: string) => {
      const entity = createEntity({ type: 'custom', label: name, shape: 'rect', width: 160, height: 110 });
      store.addEntity(entity);
      canvas.select(entity.entityId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createEntity, store.addEntity, canvas.select]
  );

  const handleDropNew = useCallback(
    (kind: string, x: number, y: number, alt?: boolean) => {
      const type = plugin.entityTypes.find((t) => t.type === kind);
      if (!type) return;
      if (type.structure) {
        const entity = createEntity(type, { x, y });
        store.addEntity(entity);
        canvas.select(entity.entityId);
        return;
      }
      if (alt) {
        const lastId = loadLastBlueprintId(vertical);
        const blueprint = lastId ? findBlueprint(allBlueprints(vertical), lastId) : undefined;
        if (blueprint) {
          handlePlaceUnit(
            {
              designation: '',
              blueprintId: blueprint.id,
              floor: plan.floor ?? '',
              section: plan.activeArea ?? '',
              state: defaultStateFor(vertical),
            },
            { x, y }
          );
          return;
        }
      }
      setPendingPlacement({ type, position: { x, y } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plugin, createEntity, store.addEntity, canvas.select, vertical, plan.floor, plan.activeArea, handlePlaceUnit]
  );

  const handleBlueprintSaved = useCallback(
    (blueprint: InventoryBlueprint) => {
      saveLastBlueprintId(vertical, blueprint.id);
      setBlueprintModal({ open: false, initial: null });
      if (pendingPlacement) {
        handlePlaceUnit({
          designation: '',
          blueprintId: blueprint.id,
          floor: plan.floor ?? '',
          section: plan.activeArea ?? '',
          state: defaultStateFor(vertical),
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [vertical, pendingPlacement, handlePlaceUnit, plan.floor, plan.activeArea]
  );

  const handleDuplicate = useCallback(
    (ids: string[]) => {
      const newIds = store.duplicateEntities(ids);
      if (newIds.length) canvas.setSelection(newIds);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [store.duplicateEntities, canvas.setSelection]
  );

  const handleDelete = useCallback(
    (ids: string[]) => {
      store.deleteEntities(ids);
      canvas.clearSelection();
      setDrawerEntityId(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [store.deleteEntities, canvas.clearSelection]
  );

  const handleDeleteSelected = useCallback(() => {
    handleDelete(canvas.selection);
  }, [handleDelete, canvas.selection]);

  const handleReset = useCallback(() => {
    if (!window.confirm('Reset this prototype floor plan back to its sample data?')) return;
    store.resetDraft();
    canvas.clearSelection();
    setDrawerEntityId(null);
    setFitSignal((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.resetDraft, canvas.clearSelection]);

  const handleModeChange = useCallback(
    (mode: typeof canvas.mode) => {
      canvas.setMode(mode);
      setDrawerEntityId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvas.setMode]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'd' && canvas.mode === 'edit' && canvas.selection.length) {
        event.preventDefault();
        handleDuplicate(canvas.selection);
        return;
      }
      if (event.key === 'Escape') {
        canvas.clearSelection();
        setDrawerEntityId(null);
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && canvas.mode === 'edit') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas.mode, canvas.selection, canvas.clearSelection, handleDeleteSelected, handleDuplicate, store.undo, store.redo]);

  const manageItems = useMemo(
    () =>
      plugin.manageToolbarItems?.({
        plan,
        selection: canvas.selection,
        updateEntity: (id, patch) => store.updateEntity(id, patch),
        addEntity: store.addEntity,
        removeEntity: store.removeEntity,
        clearSelection: canvas.clearSelection,
        setPlanMeta: store.setPlanMeta,
      }) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plugin, plan, canvas.selection]
  );

  const floors =
    plan.sectionFloors?.[plan.activeArea ?? ''] ?? plan.floors ?? (plan.floor ? [plan.floor] : []);
  const sections = plan.areas ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <FloorPlanToolbar
        plan={plan}
        plugin={plugin}
        mode={canvas.mode}
        onModeChange={handleModeChange}
        onFit={fit}
        onReset={handleReset}
        onUndo={store.undo}
        onRedo={store.redo}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        setPlanMeta={store.setPlanMeta}
        addEntity={store.addEntity}
        onMutate={store.mutate}
        onAddSection={store.addSection}
        onDeleteSection={store.deleteSection}
        onAddFloor={store.addFloor}
        onDeleteFloor={store.deleteFloor}
        updateEntity={(id, patch) => store.updateEntity(id, patch)}
        activeOverlays={activeOverlays}
        toggleOverlay={toggleOverlay}
        manageItems={manageItems}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {canvas.mode === 'edit' && (
          <ElementsPanel
            plugin={plugin}
            onAddEntity={handleAddEntity}
            onAddCustom={handleAddCustom}
            onCreateBlueprint={() => setBlueprintModal({ open: true, initial: null })}
          />
        )}

        <div className="relative flex-1">
          <CanvasSurface
            plan={plan}
            plugin={plugin}
            canvas={canvas}
            activeOverlays={activeOverlays}
            onSelect={canvas.select}
            onToggleSelect={canvas.toggleSelect}
            setSelection={canvas.setSelection}
            onCommitPositions={(positions) => store.applyPositions(positions, true)}
            onCommitGeometry={(id, geometry) => store.updateEntity(id, { spatialData: geometry })}
            onEditEntity={(id) => {
              if (canvas.mode === 'manage') setDrawerEntityId(id);
            }}
            onDropNew={handleDropNew}
            isEntityLocked={isLocked}
            highlightUnitId={highlightUnitId}
            fitSignal={fitSignal}
          />
          <CanvasControls canvas={canvas} onFit={fit} />
        </div>

        {canvas.mode === 'edit' && canvas.selection.length > 0 && (
          <PropertiesPanel
            plan={plan}
            selection={canvas.selection}
            blueprint={selectedBlueprint ?? null}
            onEditBlueprint={
              selectedBlueprint
                ? () => setBlueprintModal({ open: true, initial: selectedBlueprint })
                : undefined
            }
            onUpdate={(id, patch) => store.updateEntity(id, patch)}
            onUpdateMany={store.updateEntities}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onClose={canvas.clearSelection}
          />
        )}
      </div>

      {canvas.mode === 'manage' && drawerEntity && (
        <OperationalDrawer
          entity={drawerEntity}
          plugin={plugin}
          vertical={vertical}
          reservations={reservations ?? []}
          onClose={() => setDrawerEntityId(null)}
          onDelete={(id) => handleDelete([id])}
          onUpdate={(patch) => store.updateEntity(drawerEntity.entityId, patch)}
          onReservationChange={onReservationChange}
        />
      )}

      <AddPhysicalUnitModal
        vertical={vertical}
        isOpen={!!pendingPlacement}
        blueprints={allBlueprints(vertical)}
        floors={floors}
        sections={sections}
        defaultFloor={plan.floor}
        defaultSection={plan.activeArea}
        defaultBlueprintId={loadLastBlueprintId(vertical) ?? undefined}
        defaultState={defaultStateFor(vertical)}
        onClose={() => setPendingPlacement(null)}
        onPlace={(input) => handlePlaceUnit(input)}
      />

      <CreateBlueprintModal
        vertical={vertical}
        isOpen={blueprintModal.open}
        initial={blueprintModal.initial}
        onClose={() => setBlueprintModal({ open: false, initial: null })}
        onSaved={handleBlueprintSaved}
      />
    </div>
  );
}
