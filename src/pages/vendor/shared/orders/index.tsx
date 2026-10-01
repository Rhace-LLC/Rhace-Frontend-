import { ManagerOrdersTab } from '@/pages/staff/components/ManagerOrdersTab';

export function VendorOrdersPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="type-res-h2 text-res-ink">Orders</h1>
        <p className="type-res-body mt-1 font-normal text-res-ink-muted">
          Every pre-order and table order on this venue.
        </p>
      </div>
      <ManagerOrdersTab />
    </div>
  );
}

export default VendorOrdersPage;
