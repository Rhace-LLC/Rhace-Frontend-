import { blueprintsFor } from './blueprints';
import type { InventoryBlueprint, Vertical } from './types';

/**
 * Blueprint catalog helpers.
 *
 * `setRuntimeBlueprints` lets the API layer publish the vendor's live
 * blueprints so plugin render functions can resolve them by id without
 * threading the list through every component. Until the API list arrives, the
 * built-in seed catalog is used as a lookup fallback.
 */

const LAST_KEY = (vertical: Vertical) => `prototype:last-blueprint:${vertical}`;

const runtimeBlueprints: Partial<Record<Vertical, InventoryBlueprint[]>> = {};

/** Publishes the API-fetched blueprint list for a vertical (called by the API layer). */
export function setRuntimeBlueprints(
  vertical: Vertical,
  blueprints: InventoryBlueprint[]
): void {
  runtimeBlueprints[vertical] = blueprints;
}

export function getRuntimeBlueprints(vertical: Vertical): InventoryBlueprint[] | undefined {
  return runtimeBlueprints[vertical];
}

/** UI preference only (not domain data): remembers the last picked blueprint for fast-drop. */
export function loadLastBlueprintId(vertical: Vertical): string | null {
  try {
    return localStorage.getItem(LAST_KEY(vertical));
  } catch {
    return null;
  }
}

export function saveLastBlueprintId(vertical: Vertical, blueprintId: string): void {
  try {
    localStorage.setItem(LAST_KEY(vertical), blueprintId);
  } catch {
    /* ignore */
  }
}

/** Live (API) blueprints when available, otherwise the built-in seed catalog. */
export function allBlueprints(vertical: Vertical): InventoryBlueprint[] {
  const runtime = runtimeBlueprints[vertical];
  if (runtime && runtime.length) return runtime;
  return blueprintsFor(vertical);
}
