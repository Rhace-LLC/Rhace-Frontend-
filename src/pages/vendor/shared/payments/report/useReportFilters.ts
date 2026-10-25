import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { ReportParams, ReportPreset } from '@/services/payment.service';

export const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'last_year', label: 'Last year' },
];

export const COMPARE_LABEL: Record<ReportPreset | 'custom', string> = {
  today: 'vs yesterday',
  this_week: 'vs last week',
  last_30_days: 'vs previous 30 days',
  this_month: 'vs last month',
  last_quarter: 'vs the quarter before',
  last_year: 'vs the year before',
  custom: 'vs previous period',
};

const DEFAULT_PRESET: ReportPreset = 'last_30_days';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Filter keys shared by the overview and the transactions page. */
const SHARED_KEYS = ['preset', 'from', 'to', 'currency'];

const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Report range + currency, stored in the URL so the two payments pages share
 * it and a report link can be passed around.
 */
export function useReportFilters() {
  const [search, setSearch] = useSearchParams();

  const params = useMemo<ReportParams>(() => {
    const from = search.get('from') ?? '';
    const to = search.get('to') ?? '';
    const currency = (search.get('currency') || 'NGN').toUpperCase();
    if (DAY.test(from) && DAY.test(to)) return { from, to, currency };
    const preset = search.get('preset') as ReportPreset | null;
    return {
      preset: PRESETS.some((p) => p.value === preset) ? (preset as ReportPreset) : DEFAULT_PRESET,
      currency,
    };
  }, [search]);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          // A new range or currency starts the ledger from page 1.
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearch],
  );

  const setPreset = useCallback((preset: ReportPreset) => update({ preset, from: null, to: null }), [update]);
  const setCustom = useCallback((from: string, to: string) => update({ preset: null, from, to }), [update]);
  const setCurrency = useCallback(
    (currency: string) => update({ currency: currency === 'NGN' ? null : currency }),
    [update],
  );

  const rangeLabel = params.from
    ? `${fmtDay(params.from)} – ${fmtDay(params.to as string)}`
    : (PRESETS.find((p) => p.value === params.preset)?.label ?? 'Last 30 days');

  const compareLabel = COMPARE_LABEL[params.preset ?? 'custom'];

  /** `?preset=…&currency=…` to carry the shared filter onto another page. */
  const sharedQuery = useMemo(() => {
    const out = new URLSearchParams();
    for (const key of SHARED_KEYS) {
      const value = search.get(key);
      if (value) out.set(key, value);
    }
    const s = out.toString();
    return s ? `?${s}` : '';
  }, [search]);

  return { params, setPreset, setCustom, setCurrency, rangeLabel, compareLabel, sharedQuery };
}

/** `/dashboard/{vertical}` for the current vendor page (restaurant | hotel | club). */
export function useVendorBase(): string {
  const { pathname } = useLocation();
  const vertical = /\/dashboard\/(restaurant|hotel|club)(\/|$)/.exec(pathname)?.[1] ?? 'restaurant';
  return `/dashboard/${vertical}`;
}
