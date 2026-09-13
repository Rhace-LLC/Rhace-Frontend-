import type { ReactNode } from 'react';
import type {
  BusinessData,
  CanvasMode,
  EntityShape,
  FloorEntity,
  FloorPlan,
  FloorVertical,
  SpatialData,
} from './types';

export interface TileContext {
  mode: CanvasMode;
  selected: boolean;
  vertical: FloorVertical;
}

export interface DrawerContext {
  mode: CanvasMode;
  onUpdate: (patch: {
    businessData?: Partial<BusinessData>;
    spatialData?: Partial<SpatialData>;
  }) => void;
  onClose: () => void;
}

export interface EntityTypeDefinition {
  type: string;
  label: string;
  shape: EntityShape;
  width: number;
  height: number;
  structure?: boolean;
}

export interface ToolbarItem {
  id: string;
  label: string;
  onClick: () => void;
}

export interface ManageToolbarContext {
  plan: FloorPlan;
  selection: string[];
  updateEntity: (
    id: string,
    patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }
  ) => void;
  addEntity: (entity: FloorEntity) => void;
  removeEntity: (id: string) => void;
  clearSelection: () => void;
  setPlanMeta: (meta: Partial<FloorPlan>) => void;
}

export interface TopBarContext {
  plan: FloorPlan;
  mode: CanvasMode;
  setPlanMeta: (meta: Partial<FloorPlan>) => void;
  mutate: (updater: (plan: FloorPlan) => FloorPlan) => void;
  addSection: (name: string, defaultFloor?: string) => void;
  deleteSection: (name: string) => void;
  addFloor: (section: string, name: string) => void;
  deleteFloor: (section: string, floor: string) => void;
  addEntity: (entity: FloorEntity) => void;
  updateEntity: (
    id: string,
    patch: { businessData?: Partial<BusinessData>; spatialData?: Partial<SpatialData> }
  ) => void;
}

export interface OverlayContext {
  activeOverlays: string[];
  toggleOverlay: (id: string) => void;
}

export interface OverlayDefinition {
  id: string;
  label: string;
  render: (plan: FloorPlan, ctx: OverlayContext) => ReactNode;
}

export interface PluginTheme {
  viewport: string;
  canvas: string;
  gridLine: string;
  structure: string;
  tile: (entity: FloorEntity, selected: boolean) => string;
  accent: string;
}

export interface VerticalPlugin {
  id: FloorVertical;
  label: string;
  theme: PluginTheme;
  entityTypes: EntityTypeDefinition[];
  /** Attribute catalog shown in the properties panel. */
  attributes?: { id: string; label: string }[];
  /** Extra top-bar controls (e.g. hotel Building/Wing/Floor selector). */
  renderTopBar?: (ctx: TopBarContext) => ReactNode;
  /** Extra header controls on the Manage (list) prototype page. */
  renderManageHeader?: (ctx: TopBarContext) => ReactNode;
  /** Optional entity filter (e.g. hotel floor view). */
  filterEntities?: (plan: FloorPlan, entities: FloorEntity[]) => FloorEntity[];
  /** Set defaults (floor/area) on newly created entities. */
  decorateNewEntity?: (entity: FloorEntity, plan: FloorPlan) => FloorEntity;
  /** Rich labeled card for the Manage (list) page; falls back to renderTile. */
  renderManageCard?: (entity: FloorEntity) => ReactNode;
  /** Items shown in the toolbar while in Manage mode. */
  manageToolbarItems?: (ctx: ManageToolbarContext) => ToolbarItem[];
  renderTile: (entity: FloorEntity, ctx: TileContext) => ReactNode;
  /** Rendered for entities whose spatialData.layer === 'structure'. */
  renderStructureTile?: (entity: FloorEntity, ctx: TileContext) => ReactNode;
  /** Rendered for entities whose spatialData.layer === 'area'. */
  renderAreaTile?: (entity: FloorEntity, ctx: TileContext) => ReactNode;
  renderDrawer: (entity: FloorEntity, ctx: DrawerContext) => ReactNode;
  overlays?: OverlayDefinition[];
}
