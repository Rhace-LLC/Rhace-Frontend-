import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getPspOverview, type PspOverviewEntry } from '@/services/admin.service';

const statusTone = (p: PspOverviewEntry) => {
  if (!p.configured) return 'text-muted-foreground';
  if (!p.enabled) return 'text-amber-600';
  if (p.last24h.failed > 0 || p.last24h.needsReview > 0 || p.last24h.transfersFailed > 0)
    return 'text-amber-600';
  return 'text-emerald-600';
};

const statusLabel = (p: PspOverviewEntry) => {
  if (!p.configured) return 'Not configured';
  if (!p.enabled) return 'Paused';
  if (
    p.last24h.failed > 0 ||
    p.last24h.needsReview > 0 ||
    p.last24h.transfersFailed > 0 ||
    p.last24h.pendingOlderThan15m > 0
  )
    return 'Needs attention';
  return 'Healthy';
};

const PspHealthCards = () => {
  const [providers, setProviders] = useState<PspOverviewEntry[] | null>(null);

  useEffect(() => {
    getPspOverview()
      .then((res) => setProviders(res.data.providers))
      .catch(() => toast.error('Unable to load PSP health'));
  }, []);

  if (!providers) {
    return <div className="rounded-2xl border bg-white p-6 animate-pulse h-40" />;
  }

  return (
    <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low">
      <div className="p-6 border-b flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-lg">Provider health · last 24h</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {providers.map((p) => (
          <div key={p.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.label}</p>
              <span className={`text-xs font-semibold flex items-center gap-1 ${statusTone(p)}`}>
                {statusLabel(p) === 'Healthy' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : statusLabel(p) === 'Needs attention' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
                {statusLabel(p)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {p.currencies.length > 0 ? p.currencies.join(', ') : '—'}
              {!p.configured && ' · keys not set'}
              {p.configured && !p.enabled && ' · paused'}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Started</dt>
              <dd className="text-right font-medium">{p.last24h.initialized}</dd>
              <dt className="text-muted-foreground">Settled</dt>
              <dd className="text-right font-medium">{p.last24h.settled}</dd>
              <dt className="text-muted-foreground flex items-center gap-1" title="Settled via webhook (missed-webhook risk when low)">
                Via webhook
              </dt>
              <dd className="text-right font-medium">{p.last24h.settledViaWebhook}</dd>
              <dt className="text-muted-foreground">Failed</dt>
              <dd className={`text-right font-medium ${p.last24h.failed > 0 ? 'text-destructive' : ''}`}>
                {p.last24h.failed}
              </dd>
              <dt className="text-muted-foreground">Needs review</dt>
              <dd className={`text-right font-medium ${p.last24h.needsReview > 0 ? 'text-amber-600' : ''}`}>
                {p.last24h.needsReview}
              </dd>
              <dt className="text-muted-foreground">Stale pending</dt>
              <dd className={`text-right font-medium ${p.last24h.pendingOlderThan15m > 0 ? 'text-amber-600' : ''}`}>
                {p.last24h.pendingOlderThan15m}
              </dd>
              {p.id === 'stripe' && (
                <>
                  <dt className="text-muted-foreground">Transfers failed</dt>
                  <dd className={`text-right font-medium flex items-center justify-end gap-1 ${p.last24h.transfersFailed > 0 ? 'text-destructive' : ''}`}>
                    {p.last24h.transfersFailed > 0 && <XCircle className="h-4 w-4" />}
                    {p.last24h.transfersFailed}
                  </dd>
                </>
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PspHealthCards;
