import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportBucket, ReportParams, TimeseriesMetric } from '@/services/payment.service';
import { formatCount, formatMoney } from '@/utils/money';
import { useReportTimeseries } from '../report/queries';
import { EmptyState, ErrorState, ReportCard } from '../report/ui';
import { pillButton } from '../report/labels';

const METRICS: { value: TimeseriesMetric; label: string }[] = [
  { value: 'gross', label: 'Gross' },
  { value: 'net', label: 'Net' },
];

const BUCKETS: { value: ReportBucket; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const chartConfig = {
  current: { label: 'This period', color: 'var(--color-res-brand)' },
  previous: { label: 'Previous period', color: 'var(--color-res-ink-muted)' },
} satisfies ChartConfig;

function bucketLabel(iso: string, bucket: ReportBucket): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    bucket === 'hour'
      ? { hour: 'numeric' }
      : bucket === 'month'
        ? { month: 'short', year: '2-digit' }
        : { day: 'numeric', month: 'short' };
  return d.toLocaleString('en-NG', { ...opts, timeZone: 'Africa/Lagos' });
}

export function RevenueChart({ params, onLongerRange }: { params: ReportParams; onLongerRange: () => void }) {
  const [metric, setMetric] = useState<TimeseriesMetric>('gross');
  const [bucket, setBucket] = useState<ReportBucket | undefined>();
  const query = useReportTimeseries({ ...params, bucket }, metric);
  const data = query.data;
  const activeBucket = data?.range.bucket ?? bucket ?? 'day';
  const currency = data?.currency ?? params.currency ?? 'NGN';

  const points = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        label: bucketLabel(p.bucket, data?.range.bucket ?? 'day'),
        bucket: p.bucket,
        current: p.current,
        previous: p.previous,
      })),
    [data],
  );
  const empty = points.every((p) => !p.current && !p.previous);
  const fmt = (v: number, compact = true) =>
    metric === 'count' ? formatCount(v) : formatMoney(v, currency, { compact });

  return (
    <ReportCard
      title="Revenue over time"
      subtitle="This period, with the previous period as a faint line."
      actions={
        <>
          <div className="flex gap-1" role="group" aria-label="Metric">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={pillButton(metric === m.value)}
                aria-pressed={metric === m.value}
                onClick={() => setMetric(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Group by">
            {BUCKETS.map((b) => (
              <button
                key={b.value}
                type="button"
                className={pillButton(activeBucket === b.value)}
                aria-pressed={activeBucket === b.value}
                onClick={() => setBucket(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </>
      }
    >
      {query.isError && !data ? (
        <ErrorState message="Couldn't load the chart." onRetry={() => query.refetch()} />
      ) : query.isLoading && !data ? (
        <Skeleton className="h-64 w-full rounded-res-md" />
      ) : empty ? (
        <EmptyState
          message="No payments in this period."
          action={
            <button type="button" className={pillButton(false)} onClick={onLongerRange}>
              Show last year
            </button>
          }
        />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <ComposedChart data={points} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-current)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-current)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => fmt(v)}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-res-line)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof points)[number];
                return (
                  <div className="rounded-res-sm bg-res-card px-3 py-2 shadow-res-high">
                    <p className="type-res-caption text-res-ink-muted">{row.label}</p>
                    <p className="type-res-small font-semibold text-res-ink tabular-nums">
                      {fmt(row.current, false)}
                    </p>
                    <p className="type-res-caption text-res-ink-muted tabular-nums">
                      Previous: {fmt(row.previous, false)}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              dataKey="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="current"
              type="monotone"
              stroke="var(--color-current)"
              strokeWidth={2}
              fill="url(#revenue-fill)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </ReportCard>
  );
}
