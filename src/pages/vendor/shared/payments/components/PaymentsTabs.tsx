import { NavLink } from 'react-router';
import { useReportFilters, useVendorBase } from '../report/useReportFilters';

/** Overview · Transactions · Refunds · Settlements: every money page in one row. */
export function PaymentsTabs() {
  const base = useVendorBase();
  const { sharedQuery } = useReportFilters();
  const tabs = [
    { to: `${base}/payments${sharedQuery}`, label: 'Overview', end: true },
    { to: `${base}/payments/transactions${sharedQuery}`, label: 'Transactions', end: true },
    { to: `${base}/refunds`, label: 'Refunds', end: true },
    { to: `${base}/settlements`, label: 'Settlements', end: true },
  ];

  return (
    <nav aria-label="Payments sections" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `type-res-small inline-flex rounded-full px-4 py-2 font-semibold transition-colors ${
                  isActive
                    ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                    : 'text-res-ink-muted hover:bg-res-card hover:text-res-ink'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
