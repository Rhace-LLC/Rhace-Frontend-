import type { Vertical } from './types';

/**
 * Display name for a physical unit on canvas/timeline surfaces:
 * "T1" → "Table T1" (restaurant/club) or "Room 101" (hotel).
 * Labels that already carry the prefix are left alone.
 */
export function unitDisplayName(
  raw: string | undefined | null,
  vertical: Vertical,
  fallback = '',
): string {
  const name = (raw ?? '').trim() || fallback;
  if (!name) return '';
  if (vertical === 'hotel') {
    return /^room\b/i.test(name) ? name : `Room ${name}`;
  }
  return /^table\b/i.test(name) ? name : `Table ${name}`;
}
