import type { ReservationDraft, ReservationVertical } from '../types';

const DRAFT_PREFIX = 'reservation:draft:';
const INDEX_KEY = 'reservation:drafts';
export const DRAFT_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function storageKey(id: string): string {
  return `${DRAFT_PREFIX}${id}`;
}

function readIndex(): string[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createDraft<T extends ReservationDraft>(
  draft: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T {
  const now = Date.now();
  const value = { ...draft, id: newId(), createdAt: now, updatedAt: now } as T;
  if (isBrowser()) {
    localStorage.setItem(storageKey(value.id), JSON.stringify(value));
    writeIndex([...readIndex(), value.id]);
  }
  return value;
}

export function readDraft<T extends ReservationDraft = ReservationDraft>(
  id: string | null | undefined
): T | null {
  if (!id || !isBrowser()) return null;
  const raw = localStorage.getItem(storageKey(id));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as T;
    if (Date.now() - (draft.updatedAt || 0) > DRAFT_TTL_MS) {
      clearDraft(id);
      return null;
    }
    return draft;
  } catch {
    clearDraft(id);
    return null;
  }
}

export function updateDraft<T extends ReservationDraft>(
  id: string | null | undefined,
  patch: Partial<T>
): T | null {
  if (!id) return null;
  const current = readDraft<T>(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: Date.now() } as T;
  if (isBrowser()) localStorage.setItem(storageKey(id), JSON.stringify(next));
  return next;
}

export function saveDraft<T extends ReservationDraft>(draft: T): T {
  const existing = readDraft<T>(draft.id);
  const value = {
    ...draft,
    createdAt: existing?.createdAt ?? draft.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  } as T;
  if (isBrowser()) {
    localStorage.setItem(storageKey(value.id), JSON.stringify(value));
    if (!readIndex().includes(value.id)) writeIndex([...readIndex(), value.id]);
  }
  return value;
}

export function clearDraft(id: string | null | undefined): void {
  if (!id || !isBrowser()) return;
  localStorage.removeItem(storageKey(id));
  writeIndex(readIndex().filter((x) => x !== id));
}

export function listDrafts(vertical?: ReservationVertical): ReservationDraft[] {
  return readIndex()
    .map((id) => readDraft(id))
    .filter((d): d is ReservationDraft => Boolean(d))
    .filter((d) => !vertical || d.vertical === vertical);
}

export function pruneExpiredDrafts(): void {
  readIndex().forEach((id) => readDraft(id));
}
