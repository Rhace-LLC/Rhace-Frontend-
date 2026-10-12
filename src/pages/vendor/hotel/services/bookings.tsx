import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  hotelServiceApi,
  type ServiceBookingDto,
} from '@/services/hotelService.service';

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Phase 2 hotel vendor page: day view of experience bookings. */
export default function ServiceBookingsPage() {
  const [date, setDate] = useState(todayKey());
  const [bookings, setBookings] = useState<ServiceBookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (day: string) => {
    try {
      setLoading(true);
      setBookings(
        await hotelServiceApi.bookings({ from: `${day}T00:00:00.000Z`, to: `${day}T23:59:59.999Z` }),
      );
    } catch {
      toast.error('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const setStatus = async (b: ServiceBookingDto, status: 'completed' | 'cancelled') => {
    try {
      setBusyId(b._id);
      await hotelServiceApi.updateBooking(b._id, { status });
      toast.success(`Booking ${status}`);
      await load(date);
    } catch {
      toast.error('Could not update the booking.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Experience bookings"
        subtitle="Day view of spa, transfer and cabana reservations."
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
          />
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          No bookings on {date}.
        </div>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li
              key={b._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                    {b.status}
                  </span>
                </p>
                <p className="text-xs text-gray-500">{b.guestName ?? 'Guest'}</p>
              </div>
              {b.status === 'confirmed' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === b._id}
                    onClick={() => setStatus(b, 'completed')}
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    disabled={busyId === b._id}
                    onClick={() => setStatus(b, 'cancelled')}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
