import { Plus } from 'lucide-react';
import { useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import { PrototypeInventoryManager, hotelPlugin } from '@/features/floor-plan';
import GuestOrderingSection from '@/pages/vendor/hotel/inventory/prototype/GuestOrderingSection';
import { useNavigate } from 'react-router';

export default function PrototypeInventoryHotel() {
  const navigate = useNavigate();
  const [showQr, setShowQr] = useState(false);

  const handleAddRoom = () => {
    navigate('/dashboard/hotel/addrooms');
  };

  const breadcrumbs = (
    <nav aria-label="Breadcrumb" className="type-res-small flex items-center gap-1 font-medium mb-2">
      <button
        type="button"
        onClick={() => setShowQr(false)}
        className="cursor-pointer font-normal text-res-ink-muted transition-colors hover:text-res-brand"
      >
        Inventory
      </button>
      <span className="h-3.5 w-3.5 text-res-ink-muted">›</span>
      <span aria-current="page" className="font-semibold text-res-ink">
        Manage Stay QR
      </span>
    </nav>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardPageHeader
        title="Room Inventory"
        subtitle="Manage your hotel rooms and QR codes for guest ordering."
        actions={
          <div className="flex items-center gap-2">
            <DashboardButton
              onClick={handleAddRoom}
              variant="primary"
              text="Add Room"
              icon={<Plus className="" />}
              className="bg-[#0A6C6D] hover:bg-[#0A6C5D] text-white"
            />
            <DashboardButton
              onClick={() => setShowQr(true)}
              variant="secondary"
              text="Manage Stay QR"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M21 10c0 7-3 9-3 9H3s-3-2-3-9 3-9 3-9 3 9 3 9Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
          </div>
        }
      />

      {!showQr ? (
        <section className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-6 md:p-8">
          <h2 className="type-res-h3 text-res-ink mb-4">Room Inventory (Prototype)</h2>
          <PrototypeInventoryManager plugin={hotelPlugin} />
        </section>
      ) : (
        <>
          {breadcrumbs}
          <GuestOrderingSection />
        </>
      )}
    </div>
  );
}
