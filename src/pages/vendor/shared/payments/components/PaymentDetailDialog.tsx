import type { ReactNode } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BillingModelBadge from '@/components/billing/BillingModelBadge';
import { paymentBillingModel } from '@/components/billing/billingModel';
import { formatMoney } from '@/utils/money';
import { errorMessage, useTransaction } from '../report/queries';
import { CardSkeleton, ErrorState, ProviderBadge, StatusPill } from '../report/ui';
import { SOURCE_LABEL, methodLabel, titleCase } from '../report/labels';

const FEE_BEARER_COPY: Record<string, string> = {
  vendor: 'You pay the full transaction fee.',
  split: 'You and the customer share the transaction fee.',
  customer: 'The customer pays the transaction fee.',
  platform: 'Rhace pays the transaction fee.',
};

const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })
    : '—';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="type-res-caption text-res-ink-muted">{label}</dt>
      <dd className="type-res-small mt-0.5 break-words text-res-ink">{children}</dd>
    </div>
  );
}

/** Full detail for one payment, fetched when opened (the ledger only carries a summary row). */
export default function PaymentDetailsDialog({
  paymentId,
  onOpenChange,
}: {
  paymentId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useTransaction(paymentId);
  const p = query.data;
  const money = (v: number) => formatMoney(v, p?.currency ?? 'NGN');
  const billing = p
    ? { paymentConfig: p.paymentConfig, platformPercentage: p.platformPercentage ?? undefined }
    : null;

  return (
    <Dialog open={Boolean(paymentId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Payment {p ? `#${p.shortId}` : ''}</DialogTitle>
          <DialogDescription>{p ? when(p.at) : 'Loading payment…'}</DialogDescription>
        </DialogHeader>

        {query.isError ? (
          <ErrorState message={errorMessage(query.error, "Couldn't load this payment.")} onRetry={() => query.refetch()} />
        ) : !p ? (
          <CardSkeleton rows={6} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-res-md bg-res-surface p-4">
              <div>
                <p className="type-res-caption text-res-ink-muted">Amount</p>
                <p className="type-res-h2 text-res-ink tabular-nums">{money(p.amount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill status={p.status} />
                <ProviderBadge provider={p.provider} />
              </div>
            </div>

            <section>
              <h3 className="type-res-small mb-3 font-semibold text-res-ink">Customer</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">{p.customerName}</Field>
                <Field label="Email">{p.email ?? '—'}</Field>
                <Field label="Source">{SOURCE_LABEL[p.source] ?? titleCase(p.source)}</Field>
                <Field label="Method">{methodLabel(p.method)}</Field>
              </dl>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="type-res-small font-semibold text-res-ink">Breakdown</h3>
                <BillingModelBadge payment={billing} />
              </div>
              {paymentBillingModel(billing) === 'subscription' && (
                <p className="type-res-caption -mt-1 mb-3 text-res-ink-muted">
                  Taken under your subscription: no platform share, and the transaction fee is deducted from your share.
                </p>
              )}
              <dl className="space-y-2">
                {[
                  ['Gross', money(p.amount)],
                  ['Platform commission', `−${money(p.platformShare)}`],
                  ['Transaction fee (your part)', `−${money(p.transactionFee)}`],
                  ...(p.refundedAmount ? [['Refunded', `−${money(p.refundedAmount)}`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="type-res-small text-res-ink-muted">{label}</dt>
                    <dd className="type-res-small text-res-ink tabular-nums">{value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-res-line pt-2">
                  <dt className="type-res-small font-semibold text-res-ink">Net to you</dt>
                  <dd className="type-res-body font-semibold text-res-brand tabular-nums">
                    {money(p.netToVendor - p.refundedAmount)}
                  </dd>
                </div>
              </dl>
              {p.provider !== 'offline' && (
                <p className="type-res-caption mt-2 text-res-ink-muted">
                  Provider fee {money(p.providerFee)}. {FEE_BEARER_COPY[p.feeBearer] ?? ''}
                </p>
              )}
            </section>

            {p.refunds.length > 0 && (
              <section>
                <h3 className="type-res-small mb-3 font-semibold text-res-ink">Refunds</h3>
                <ul className="space-y-2">
                  {p.refunds.map((r) => (
                    <li key={r._id} className="flex justify-between gap-3 rounded-res-sm bg-res-surface px-3 py-2">
                      <span className="type-res-small text-res-ink">
                        {r.ticketNo ?? 'Refund'} · {titleCase(r.status)}
                        {r.reason && <span className="text-res-ink-muted"> · {r.reason}</span>}
                      </span>
                      <span className="type-res-small text-res-ink tabular-nums">{formatMoney(r.amount, r.currency)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="type-res-small mb-3 font-semibold text-res-ink">References</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Payment ID">
                  <span className="font-mono">{p._id}</span>
                </Field>
                <Field label="Provider reference">
                  <span className="font-mono">{p.reference ?? '—'}</span>
                </Field>
                <Field label="Started">{when(p.createdAt)}</Field>
                <Field label="Paid">{when(p.paidAt)}</Field>
                {p.offline?.note && <Field label="Note">{p.offline.note}</Field>}
              </dl>
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(p.reference ?? p._id);
                    toast.success('Reference copied');
                  } catch {
                    toast.error('Could not copy');
                  }
                }}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink hover:text-res-brand"
              >
                Copy reference
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
