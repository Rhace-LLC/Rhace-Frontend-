import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FIELD_CLASS, SurfaceCard } from '@/components/dashboard/res-ui';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { money } from '@/features/orders/money';
import {
  settlementApi,
  type OutletRevenueRow,
  type SettlementSide,
} from '@/services/settlement.service';
import { CARD_PAD, isoDay } from './shared';

const DATE_FIELD = `${FIELD_CLASS} h-10 w-auto`;

type Postings = Awaited<ReturnType<typeof settlementApi.folioPostings>>;

function Empty({ children }: { children: string }) {
  return (
    <p className="type-res-small rounded-res-md bg-res-surface px-4 py-8 text-center font-normal text-res-ink-muted">
      {children}
    </p>
  );
}

/** Revenue & commission per outlet (or per hotel), plus hotel folio postings. */
export function ReportsView({ side }: { side: SettlementSide }) {
  const [from, setFrom] = useState(isoDay(-30));
  const [to, setTo] = useState(isoDay());
  const [rows, setRows] = useState<OutletRevenueRow[] | null>(null);
  const [postingDate, setPostingDate] = useState(isoDay());
  const [postings, setPostings] = useState<Postings | null>(null);

  useEffect(() => {
    setRows(null);
    settlementApi
      .outletRevenue({ from, to: `${to}T23:59:59.999Z` })
      .then((r) => setRows(r.rows))
      .catch(() => {
        setRows([]);
        toast.error('Could not load the revenue report.');
      });
  }, [from, to]);

  useEffect(() => {
    if (side !== 'hotel') return;
    setPostings(null);
    settlementApi
      .folioPostings(postingDate)
      .then(setPostings)
      .catch(() => toast.error('Could not load folio postings.'));
  }, [side, postingDate]);

  const totals = rows?.reduce(
    (acc, r) => ({
      orders: acc.orders + r.orders,
      gross: acc.gross + r.gross,
      commission: acc.commission + r.commission,
      net: acc.net + r.net,
    }),
    { orders: 0, gross: 0, commission: 0, net: 0 }
  );

  return (
    <div className="space-y-5">
      <SurfaceCard className={CARD_PAD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="type-res-h3 text-res-ink">
              {side === 'hotel'
                ? 'Revenue & commission by outlet'
                : 'Room-service revenue by hotel'}
            </h2>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              Outlet orders in the selected dates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="From"
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className={DATE_FIELD}
            />
            <span className="type-res-small text-res-ink-muted">to</span>
            <Input
              aria-label="To"
              type="date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className={DATE_FIELD}
            />
          </div>
        </div>

        {!rows ? (
          <Skeleton className="h-32 w-full rounded-res-md" />
        ) : rows.length === 0 ? (
          <Empty>No outlet orders in this period.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="type-res-caption tracking-wider text-res-ink-muted uppercase">
                  <th className="py-2.5 pr-3 font-normal">
                    {side === 'hotel' ? 'Outlet' : 'Hotel'}
                  </th>
                  <th className="px-3 py-2.5 text-right font-normal">Orders</th>
                  <th className="px-3 py-2.5 text-right font-normal">Food & drink</th>
                  <th className="px-3 py-2.5 text-right font-normal">Commission</th>
                  <th className="px-3 py-2.5 text-right font-normal">Hotel fees</th>
                  <th className="px-3 py-2.5 text-right font-normal">Room tab</th>
                  <th className="px-3 py-2.5 text-right font-normal">Online</th>
                  <th className="py-2.5 pl-3 text-right font-normal">Net to outlet</th>
                </tr>
              </thead>
              <tbody className="type-res-small divide-y divide-res-line text-res-ink tabular-nums">
                {rows.map((r) => (
                  <tr key={r.vendorLink}>
                    <td className="py-3 pr-3 font-semibold">
                      {(side === 'hotel' ? r.outletName || r.counterpartName : r.counterpartName) ||
                        '—'}
                    </td>
                    <td className="px-3 py-3 text-right">{r.orders}</td>
                    <td className="px-3 py-3 text-right">{money(r.gross)}</td>
                    <td className="px-3 py-3 text-right">{money(r.commission)}</td>
                    <td className="px-3 py-3 text-right">{money(r.hotelFees)}</td>
                    <td className="px-3 py-3 text-right">{money(r.roomCharged)}</td>
                    <td className="px-3 py-3 text-right">{money(r.online)}</td>
                    <td className="py-3 pl-3 text-right font-semibold">{money(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && rows.length > 1 && (
                <tfoot>
                  <tr className="type-res-small border-t-2 border-res-line font-semibold text-res-ink tabular-nums">
                    <td className="py-3 pr-3">Total</td>
                    <td className="px-3 py-3 text-right">{totals.orders}</td>
                    <td className="px-3 py-3 text-right">{money(totals.gross)}</td>
                    <td className="px-3 py-3 text-right">{money(totals.commission)}</td>
                    <td className="px-3 py-3" colSpan={3} />
                    <td className="py-3 pl-3 text-right text-res-brand">{money(totals.net)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </SurfaceCard>

      {side === 'hotel' && (
        <SurfaceCard className={CARD_PAD}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="type-res-h3 text-res-ink">Folio postings</h2>
              <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
                Room charges posted on a day, by revenue code.
              </p>
            </div>
            <Input
              aria-label="Posting date"
              type="date"
              value={postingDate}
              onChange={(e) => e.target.value && setPostingDate(e.target.value)}
              className={DATE_FIELD}
            />
          </div>
          {!postings ? (
            <Skeleton className="h-20 w-full rounded-res-md" />
          ) : postings.groups.length === 0 ? (
            <Empty>Nothing posted on this day.</Empty>
          ) : (
            <ul className="space-y-2">
              {postings.groups.map((g) => (
                <li
                  key={g.revenueCode}
                  className="flex items-center justify-between gap-3 rounded-res-md bg-res-surface px-4 py-3"
                >
                  <span className="type-res-small text-res-ink">
                    <span className="font-mono font-semibold">{g.revenueCode}</span>
                    <span className="text-res-ink-muted">
                      {' '}
                      · {g.count} posting{g.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="type-res-body font-semibold text-res-ink tabular-nums">
                    {money(g.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
