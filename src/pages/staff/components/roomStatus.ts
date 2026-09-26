/**
 * Shared color-coded room states for staff workspaces (housekeeping, front
 * desk). Words stay plain; colour carries the at-a-glance meaning:
 * green = ready, amber/sky = work in progress, indigo = guest in,
 * red = blocked. Status colours are intentionally outside the res token
 * scale (which defines no semantic palette).
 */
export interface RoomStatusMeta {
  label: string;
  pill: string;
  dot: string;
}

export const ROOM_STATUS: Record<string, RoomStatusMeta> = {
  vacant_clean: { label: 'Ready', pill: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  inspected: { label: 'Inspected', pill: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500' },
  vacant_dirty: { label: 'Dirty', pill: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  cleaning_in_progress: {
    label: 'Cleaning',
    pill: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-500',
  },
  occupied: { label: 'Occupied', pill: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
  out_of_order_ooo: { label: 'Out of order', pill: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

export function roomStatusMeta(state: string): RoomStatusMeta {
  return (
    ROOM_STATUS[state] ?? {
      label: state.replace(/_/g, ' ') || 'Unknown',
      pill: 'bg-res-surface text-res-ink-muted',
      dot: 'bg-res-ink-muted',
    }
  );
}
