import type { ReactNode } from 'react';

/**
 * Shared building blocks for the vendor screens that follow
 * `design/for-reservations-and-booking` (Soft SaaS / Modern Dashboard
 * Minimalist) — the same rules the `res-*` tokens encode in
 * `src/styles/reservation-tokens.css`.
 *
 * Rules this module enforces so every redesign agrees:
 *  - Solid, fully opaque surfaces. White cards on a tinted canvas, tinted
 *    insets inside white cards. No translucency, no backdrop blur.
 *  - Elevation comes from `shadow-res-*`, not from 1px borders. `res-line` is
 *    for dividers and selected-state edges only.
 *  - Radii: 28px cards, 20px insets, 12px fields, pills for chips/actions.
 *  - Type: `.type-res-*` classes only (size + weight + leading + tracking).
 *  - Actions are pills. Destructive actions are *tinted* red with red text —
 *    never a solid red fill under red text.
 *  - Fields take the full width of their container.
 */

/* ── page scaffolds ──────────────────────────────────────────────────────── */

/** Level 0 canvas. */
export const PAGE_SHELL = 'min-h-full bg-res-surface px-4 py-6 md:px-8';

/** 1280px container, comfortable 24px rhythm. */
export const PAGE_BODY = 'mx-auto w-full max-w-[1280px] space-y-6';

/** Modal surface: solid white, 28px radius, floating shadow, no hairline border. */
export const MODAL_CONTENT_CLASS =
  'gap-5 rounded-res-lg border-0 bg-res-card p-6 shadow-res-high sm:max-w-lg';

/* ── actions ─────────────────────────────────────────────────────────────── */

/** Level 4: the one primary action on a surface. */
export const PILL_PRIMARY =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-res-brand px-5 py-2.5 type-res-small font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

/** Level 2: secondary action on a tinted surface. */
export const PILL_QUIET =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-res-surface px-5 py-2.5 type-res-small font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:pointer-events-none disabled:opacity-50';

/** Destructive: tinted so the icon and label stay legible. */
export const PILL_DANGER =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2.5 type-res-small font-semibold text-red-600 transition-colors outline-none hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-50';

/** Inline text action (Edit / Save / Cancel inside a detail row). */
export const TEXT_ACTION =
  'type-res-small cursor-pointer rounded-full px-2.5 py-1 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:pointer-events-none disabled:opacity-50';

/* ── fields ──────────────────────────────────────────────────────────────── */

/** Full-width field surface for `<Input>`, `<Textarea>` and `<SelectTrigger>`. */
export const FIELD_CLASS =
  'h-11 w-full rounded-res-sm border-0 bg-res-surface px-3.5 type-res-body font-normal text-res-ink shadow-none outline-none placeholder:text-res-ink-muted focus-visible:ring-2 focus-visible:ring-res-brand';

/** Small uppercase section label used above fields and inside insets. */
export const EYEBROW = 'type-res-caption block uppercase tracking-wider text-res-ink-muted';

/* ── surfaces ────────────────────────────────────────────────────────────── */

/** Level 1: white card on the canvas. */
export function SurfaceCard({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
}) {
  return <Tag className={`rounded-res-lg bg-res-card shadow-res-low ${className}`}>{children}</Tag>;
}

/** Level 2: tinted container nested inside a white card. */
export function InsetBlock({
  title,
  description,
  children,
  className = '',
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full rounded-res-md bg-res-surface p-4 ${className}`}>
      {title && <p className={`${EYEBROW} mb-2`}>{title}</p>}
      {description && (
        <p className="type-res-caption mb-2 font-normal text-res-ink-muted">{description}</p>
      )}
      {children}
    </div>
  );
}

/**
 * Labelled full-width field. Every control inside a modal goes through this so
 * inputs and selects always span the dialog instead of being squeezed into
 * narrow grid columns.
 */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={htmlFor} className={`${EYEBROW} w-full`}>
        {label}
      </label>
      {children}
      {hint && <p className="type-res-caption font-normal text-res-ink-muted">{hint}</p>}
    </div>
  );
}

/* ── read-only pieces ────────────────────────────────────────────────────── */

const STAT_TONE: Record<string, string> = {
  brand: 'text-res-brand',
  positive: 'text-emerald-600',
  attention: 'text-amber-600',
  neutral: 'text-res-ink-muted',
};

export function StatTile({
  label,
  value,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: keyof typeof STAT_TONE;
}) {
  return (
    <div className="flex items-center justify-between rounded-res-lg bg-res-card px-5 py-4 shadow-res-low">
      <div>
        <p className="type-res-caption uppercase tracking-wider text-res-ink-muted">{label}</p>
        <p className="type-res-h2 mt-1 text-res-ink">{value}</p>
      </div>
      <span
        className={`flex size-11 items-center justify-center rounded-full bg-res-surface ${STAT_TONE[tone]}`}
      >
        {icon}
      </span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-res-lg bg-res-card px-6 py-14 text-center shadow-res-low">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-res-surface text-res-brand">
        {icon}
      </span>
      <h2 className="type-res-h3 mt-4 text-res-ink">{title}</h2>
      <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
