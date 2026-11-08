import { Link, Navigate, useLocation } from 'react-router';
import { PAYMENT_TABS, paymentsTabHref, type PaymentTab } from '../report/tabs';
import { useReportFilters, useVendorBase } from '../report/useReportFilters';

/** Overview · Transactions · Refunds · Settlements, all on /payments (`?tab=`). */
export function PaymentsTabs({ active }: { active: PaymentTab }) {
  const base = useVendorBase();
  const { sharedQuery } = useReportFilters();

  return (
    <nav aria-label="Payments sections" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {PAYMENT_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                to={paymentsTabHref(base, tab.key, sharedQuery)}
                aria-current={isActive ? 'page' : undefined}
                className={`type-res-small inline-flex rounded-full px-4 py-2 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                  isActive
                    ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                    : 'text-res-ink-muted hover:bg-res-card hover:text-res-ink'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Old standalone URLs (`/payments/transactions`, `/refunds`, `/settlements`)
 * land on the matching tab, keeping their query (e.g. `?orderId=`).
 */
export function PaymentsTabRedirect({ tab }: { tab: PaymentTab }) {
  const { search } = useLocation();
  const base = useVendorBase();
  const extra = Object.fromEntries(new URLSearchParams(search));
  return <Navigate replace to={paymentsTabHref(base, tab, '', extra)} />;
}
