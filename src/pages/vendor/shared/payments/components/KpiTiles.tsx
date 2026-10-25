import { Skeleton } from '@/components/ui/skeleton';
import type { ReportSummaryDto, ReportTotals } from '@/services/payment.service';
import { formatCount, formatMoney } from '@/utils/money';
import { ChangeChip, ErrorState } from '../report/ui';

interface Tile {
  key: keyof ReportTotals;
  label: string;
  hint: string;
  money: boolean;
  /** Costs read as bad when they rise. */
  goodWhenUp: boolean;
}

const TILES: Tile[] = [
  { key: 'gross', label: 'Gross', hint: 'Everything customers paid you in this period.', money: true, goodWhenUp: true },
  {
    key: 'net',
    label: 'Net to you',
    hint: 'Your share after platform commission and your part of transaction fees, before refunds.',
    money: true,
    goodWhenUp: true,
  },
  {
    key: 'transactionFees',
    label: 'Transaction fees',
    hint: 'Fees charged by payment providers for processing online payments. Shows only the part you pay under your fee plan.',
    money: true,
    goodWhenUp: false,
  },
  { key: 'refunds', label: 'Refunds', hint: 'Refunds paid back to guests in this period.', money: true, goodWhenUp: false },
  { key: 'count', label: 'Transactions', hint: 'Successful payments in this period.', money: false, goodWhenUp: true },
];

export function KpiTiles({
  summary,
  loading,
  error,
  onRetry,
  compareLabel,
}: {
  summary?: ReportSummaryDto;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  compareLabel: string;
}) {
  if (error && !summary) {
    return (
      <div className="rounded-res-lg bg-res-card shadow-res-low">
        <ErrorState message="Couldn't load your payment totals." onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="grid min-w-140 grid-cols-2 gap-3 sm:grid-cols-3 md:min-w-0 lg:grid-cols-5">
        {TILES.map((tile) => {
          const value = summary?.current[tile.key] ?? 0;
          const currency = summary?.currency ?? 'NGN';
          const exact = tile.money ? formatMoney(value as number, currency) : String(value);
          return (
            <li key={tile.key} className="rounded-res-lg bg-res-card p-4 shadow-res-low" title={tile.hint}>
              <p className="type-res-small text-res-ink-muted">{tile.label}</p>
              {loading && !summary ? (
                <Skeleton className="mt-2 h-8 w-24 rounded-res-sm" />
              ) : (
                <p className="type-res-h2 mt-1 text-res-ink tabular-nums" title={exact}>
                  {tile.money ? formatMoney(value as number, currency, { compact: true }) : formatCount(value as number)}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-2">
                {summary && (
                  <ChangeChip value={summary.change[tile.key]} goodWhenUp={tile.goodWhenUp} suffix={compareLabel} />
                )}
                {tile.key === 'count' && summary?.current.successRate !== null && summary && (
                  <span className="type-res-caption text-res-ink-muted">· {summary.current.successRate}% succeeded</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
