export interface DishFormState {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  tags: string[];
  mealTimes: string[];
  discount: boolean;
  discountPrice: number;
  coverImage: string;
  addonIds: string[];
  isVisible: boolean;
}

export interface DishDraft {
  id: string;
  vendorId: string;
  updatedAt: string;
  data: DishFormState;
}

export const EMPTY_DISH_FORM: DishFormState = {
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  tags: [],
  mealTimes: [],
  discount: false,
  discountPrice: 0,
  coverImage: '',
  addonIds: [],
  isVisible: true,
};

const keyFor = (vendorId: string) => `dish_drafts_${vendorId}`;

function readAll(vendorId: string): DishDraft[] {
  try {
    const raw = localStorage.getItem(keyFor(vendorId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DishDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(vendorId: string, drafts: DishDraft[]): void {
  try {
    localStorage.setItem(keyFor(vendorId), JSON.stringify(drafts));
  } catch {
    // Storage full or unavailable — drafts are best-effort.
  }
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export function listDishDrafts(vendorId: string): DishDraft[] {
  return readAll(vendorId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getDishDraft(vendorId: string, id: string): DishDraft | null {
  return readAll(vendorId).find((d) => d.id === id) ?? null;
}

/** Creates or refreshes a draft; returns the draft id. */
export function saveDishDraft(vendorId: string, data: DishFormState, id?: string | null): string {
  const drafts = readAll(vendorId);
  const draftId = id ?? newId();
  const draft: DishDraft = {
    id: draftId,
    vendorId,
    updatedAt: new Date().toISOString(),
    data,
  };
  const next = [draft, ...drafts.filter((d) => d.id !== draftId)].slice(0, 25);
  writeAll(vendorId, next);
  return draftId;
}

export function deleteDishDraft(vendorId: string, id: string): void {
  writeAll(
    vendorId,
    readAll(vendorId).filter((d) => d.id !== id),
  );
}
