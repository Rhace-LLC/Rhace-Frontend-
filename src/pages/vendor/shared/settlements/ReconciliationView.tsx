import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  FIELD_CLASS,
  PILL_QUIET,
  SegmentedControl,
  SurfaceCard,
  TonePill,
} from '@/components/dashboard/res-ui';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { money } from '@/features/orders/money';
import { useVendorEvents } from '@/features/orders/realtime';
import {
  settlementApi,
  type ReconciliationReportDto,
  type SettlementSide,
} from '@/services/settlement.service';
import { CARD_PAD, day, errorMessage, isoDay } from './shared';

const FILTERS = [
  { value: 'all', label: 'All days' },
  { value: 'mismatch', label: 'Mismatches' },
] as const;

/** Nightly match of room charges, accepted outlet orders and amounts owed, per outlet. */
export function ReconciliationView({ side }: { side: SettlementSide }) {
  const [reports, setReports] = useState<ReconciliationReportDto[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'mismatch'>('all');
  const [runDate, setRunDate] = useState(isoDay(-1));
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      setReports(
        await settlementApi.reconciliation({
          status: filter === 'mismatch' ? 'mismatch' : undefined,
        })
      );
    } catch {
      setReports([]);
      toast.error('Could not load reconciliation reports.');
    }
  }, [filter]);

  useEffect(() => {
    setReports(null);
    void load();
  }, [load]);
  useVendorEvents(['reconciliation:mismatch'], () => void load());

  const run = async () => {
    try {
      setRunning(true);
      const res = await settlementApi.runReconciliation(runDate);
      const mismatches = res.filter((r) => r.status === 'mismatch').length;
      toast.success(
        `${res.length} outlet report(s) · ${mismatches} mismatch${mismatches === 1 ? '' : 'es'}`
      );
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not run reconciliation.'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <SurfaceCard className={CARD_PAD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-md">
          <h2 className="type-res-h3 text-res-ink">Nightly reconciliation</h2>
          <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
            Each night, posted room charges, accepted outlet orders and amounts owed to outlets are
            matched per outlet.
          </p>
        </div>
        {side === 'hotel' && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Day to reconcile"
              type="date"
              value={runDate}
              max={isoDay()}
              onChange={(e) => e.target.value && setRunDate(e.target.value)}
              className={`${FIELD_CLASS} h-10 w-auto`}
            />
            <button
              type="button"
              disabled={running}
              onClick={() => void run()}
              className={PILL_QUIET}
            >
              <RefreshCw
                className={`size-4 ${running ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
                aria-hidden
              />
              Re-run day
            </button>
          </div>
        )}
      </div>

      <SegmentedControl
        label="Reconciliation filter"
        value={filter}
        onChange={setFilter}
        options={FILTERS}
      />

      {!reports ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-res-md" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-res-surface text-res-brand">
            <ShieldCheck className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <p className="type-res-body text-res-ink">
            {filter === 'mismatch' ? 'No mismatches' : 'No reports yet'}
          </p>
          <p className="type-res-small max-w-xs font-normal text-res-ink-muted">
            {filter === 'mismatch'
              ? 'Every reconciled day matched.'
              : 'Reports appear here after the first nightly run.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const ok = r.status === 'ok';
            return (
              <li key={r._id} className="rounded-res-md bg-res-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="type-res-body font-semibold text-res-ink">
                    {r.outletName || 'Outlet'}
                    <span className="font-normal text-res-ink-muted"> · {day(r.date)}</span>
                  </p>
                  <TonePill tone={ok ? 'positive' : 'danger'}>
                    {ok ? 'Matched' : `${r.issues.length} issue${r.issues.length === 1 ? '' : 's'}`}
                  </TonePill>
                </div>
                <dl className="type-res-caption mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-res-ink-muted sm:grid-cols-4">
                  <div>
                    <dt>Orders</dt>
                    <dd className="type-res-small font-semibold text-res-ink tabular-nums">
                      {r.totals.orders} · {money(r.totals.ordersTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt>Room charges</dt>
                    <dd className="type-res-small font-semibold text-res-ink tabular-nums">
                      {money(r.totals.folioPosted)}
                    </dd>
                  </div>
                  <div>
                    <dt>Owed to outlet</dt>
                    <dd className="type-res-small font-semibold text-res-ink tabular-nums">
                      {money(r.totals.accruedNet)}
                    </dd>
                  </div>
                  <div>
                    <dt>Paid online</dt>
                    <dd className="type-res-small font-semibold text-res-ink tabular-nums">
                      {r.totals.onlineOrders}
                    </dd>
                  </div>
                </dl>
                {r.issues.length > 0 && (
                  <ul className="mt-3 space-y-1.5 rounded-res-sm bg-red-50 px-3.5 py-3">
                    {r.issues.map((issue, idx) => (
                      <li key={idx} className="type-res-small flex gap-2 text-red-800">
                        <AlertTriangle
                          className="mt-px size-3.5 shrink-0"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {issue.detail}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceCard>
  );
}
