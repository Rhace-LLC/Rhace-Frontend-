import { useEffect, useState } from 'react';
import { Webhook } from 'lucide-react';
import { toast } from 'react-toastify';
import { getPspEvents, type PspWebhookEvent } from '@/services/admin.service';

const PspEventsFeed = () => {
  const [events, setEvents] = useState<PspWebhookEvent[]>([]);

  useEffect(() => {
    getPspEvents({ limit: 20 })
      .then((res) => setEvents(res.data.events))
      .catch(() => toast.error('Unable to load webhook events'));
  }, []);

  return (
    <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
      <div className="p-6 border-b flex items-center gap-2">
        <Webhook className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="font-semibold text-lg">Recent webhook deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Stripe events (verified + de-duplicated). Paystack/Monnify volume is visible in the
            “via webhook” row above.
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No webhook events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left">Event</th>
                <th className="px-5 py-3 text-left">Payment</th>
                <th className="px-5 py-3 text-left">Mode</th>
                <th className="px-5 py-3 text-left">Received</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.eventId} className="border-t">
                  <td className="px-5 py-3 font-mono text-xs">{e.type}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {e.paymentId ? `…${e.paymentId.slice(-8)}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        e.livemode ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.livemode ? 'live' : 'test'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(e.receivedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PspEventsFeed;
