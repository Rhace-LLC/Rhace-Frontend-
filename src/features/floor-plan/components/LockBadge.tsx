import { Lock } from 'lucide-react';

/** Pulsing lock indicator used on canvas tiles and board cards. */
export function LockBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="pointer-events-none inline-flex animate-pulse items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      <Lock size={10} />
      {!compact && 'locked'}
    </span>
  );
}
