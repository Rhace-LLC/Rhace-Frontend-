import { Link } from 'react-router';
import { ChevronRight, Wallet } from 'lucide-react';
import { useVendorBase } from '../report/useReportFilters';

/** Entry point on the general settings page; payment settings have their own page. */
export function PaymentSettingsLink() {
  const base = useVendorBase();
  return (
    <Link
      to={`${base}/settings/payments`}
      className="flex items-center gap-4 rounded-res-lg bg-res-card p-5 shadow-res-low transition-shadow hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand focus-visible:outline-none"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-res-sm bg-res-secondary text-res-brand">
        <Wallet className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="type-res-h3 block text-res-ink">Payment settings</span>
        <span className="type-res-small block text-res-ink-muted">Payout account and payment providers</span>
      </span>
      <ChevronRight className="size-5 text-res-ink-muted" aria-hidden />
    </Link>
  );
}
