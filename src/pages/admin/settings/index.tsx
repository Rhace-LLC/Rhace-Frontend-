import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import RevenueSplitCard from './RevenueSplitCard';
import SubscriptionPlansCard from './SubscriptionPlansCard';

/**
 * Platform settings.
 *
 * Audit note (2026-10-11): this page used to host six tabs (General, Vendor,
 * Reservation, Payment & Payouts legacy controls, Notifications, Security).
 * Every control outside RevenueSplitCard was mock UI — uncontrolled inputs
 * (`defaultValue`/`defaultChecked`) whose Save buttons sent empty payloads,
 * with no reader anywhere in the backend (outside inert defaults/validation
 * in `setting.controller.ts`) or the frontend. The legacy payout controls
 * were doubly dead: manual payouts are deprecated (vendors are paid by PSP
 * split/transfer) and `initiatePayout` never read those keys. All of it was
 * removed; what remains is the one live surface — revenue split + PSP
 * routing, saved through superadmin-only PUT /settings/revenue — plus the
 * vendor subscription plans that sit beside it (/billing/admin/plans).
 */
export default function Settings() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <DashboardPageHeader
        title="Settings"
        subtitle="Platform revenue split, payment provider routing and vendor subscription plans."
      />

      <RevenueSplitCard />

      <SubscriptionPlansCard />
    </div>
  );
}
