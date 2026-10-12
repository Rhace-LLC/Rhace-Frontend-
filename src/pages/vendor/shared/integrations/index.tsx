import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { envConfig } from '@/envloader';
import {
  integrationApi,
  type ApiClientDto,
  type WebhookDeliveryDto,
  type WebhookEndpointDto,
} from '@/services/integration.service';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const DELIVERY_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  dead: 'bg-gray-200 text-gray-600',
};

/** Shows a secret exactly once with a copy button and a warning. */
function SecretOnce({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{label} — copy it now, it won&apos;t be shown again.</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            toast.success('Copied');
          }}
          className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Copy
        </button>
      </div>
      <button type="button" onClick={onDone} className="text-xs font-semibold text-amber-900 underline">
        I&apos;ve stored it safely
      </button>
    </div>
  );
}

function TopicPicker({ topics, value, onChange }: { topics: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const all = value.includes('*');
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Events">
      <button
        type="button"
        aria-pressed={all}
        onClick={() => onChange(all ? [] : ['*'])}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${all ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
      >
        All events
      </button>
      {!all &&
        topics.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
              className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t}
            </button>
          );
        })}
    </div>
  );
}

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const [rows, setRows] = useState<WebhookDeliveryDto[] | null>(null);
  const load = useCallback(async () => {
    try {
      setRows(await integrationApi.deliveries(endpointId));
    } catch {
      toast.error('Could not load deliveries.');
    }
  }, [endpointId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!rows) return <div className="h-16 animate-pulse rounded-xl bg-gray-100" />;
  if (!rows.length) return <p className="text-xs text-gray-500">No deliveries yet. Send a test ping.</p>;
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => void load()} className="text-xs font-semibold text-slate-700 underline">
        Refresh
      </button>
      <ul className="max-h-64 space-y-1 overflow-auto">
        {rows.map((d) => (
          <li key={d._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-xs">
            <span className="min-w-0">
              <span className="font-mono">{d.topic}</span> · {new Date(d.createdAt).toLocaleString()} · {d.attempts} attempt(s)
              {d.lastStatusCode ? ` · HTTP ${d.lastStatusCode}` : ''}
              {d.lastError && d.status !== 'succeeded' ? ` · ${d.lastError}` : ''}
            </span>
            <span className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${DELIVERY_STYLE[d.status]}`}>{d.status}</span>
              {d.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() =>
                    integrationApi
                      .redeliver(d._id)
                      .then(() => toast.success('Redelivery queued'))
                      .then(load)
                      .catch(() => toast.error('Could not redeliver.'))
                  }
                  className="font-semibold text-slate-700 underline"
                >
                  Resend
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebhooksSection({ topics }: { topics: string[] }) {
  const [endpoints, setEndpoints] = useState<WebhookEndpointDto[]>([]);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['order:created', 'order:accepted', 'order:status']);
  const [secret, setSecret] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEndpoints(await integrationApi.webhooks());
    } catch {
      toast.error('Could not load webhooks.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Something went wrong.'));
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">Webhooks</h2>
        <p className="text-xs text-gray-500">
          We POST signed JSON to your HTTPS endpoint for each event. Verify the <code>X-Rhace-Signature</code> header
          (HMAC-SHA256 of <code>timestamp.body</code>) with the endpoint secret.
        </p>
      </div>

      {secret && <SecretOnce label="Webhook signing secret" value={secret} onDone={() => setSecret(null)} />}

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <input
          aria-label="Endpoint URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-system.example.com/rhace/webhooks"
          className={inputClass}
        />
        <TopicPicker topics={topics} value={events} onChange={setEvents} />
        <button
          type="button"
          disabled={!url.trim() || !events.length}
          onClick={() =>
            act(async () => {
              const res = await integrationApi.createWebhook({ url: url.trim(), events });
              setSecret(res.secret);
              setUrl('');
            }, 'Webhook added')
          }
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add endpoint
        </button>
      </div>

      {endpoints.length === 0 ? (
        <p className="text-sm text-gray-500">No webhook endpoints yet.</p>
      ) : (
        <ul className="space-y-2">
          {endpoints.map((ep) => (
            <li key={ep._id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{ep.url}</p>
                  <p className="text-xs text-gray-500">
                    {ep.events.includes('*') ? 'All events' : ep.events.join(', ')}
                    {ep.lastSuccessAt ? ` · last OK ${new Date(ep.lastSuccessAt).toLocaleString()}` : ''}
                  </p>
                  {ep.disabledReason && <p className="text-xs font-semibold text-red-600">{ep.disabledReason}</p>}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ep.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ep.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <button type="button" onClick={() => act(() => integrationApi.testWebhook(ep._id), 'Test ping queued')} className="text-slate-700">
                  Send test
                </button>
                <button
                  type="button"
                  onClick={() => act(() => integrationApi.updateWebhook(ep._id, { active: !ep.active }), ep.active ? 'Paused' : 'Resumed')}
                  className="text-slate-700"
                >
                  {ep.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(async () => {
                      const res = await integrationApi.rotateWebhookSecret(ep._id);
                      setSecret(res.secret);
                    }, 'Secret rotated')
                  }
                  className="text-slate-700"
                >
                  Rotate secret
                </button>
                <button
                  type="button"
                  aria-expanded={expanded === ep._id}
                  onClick={() => setExpanded(expanded === ep._id ? null : ep._id)}
                  className="text-slate-700"
                >
                  {expanded === ep._id ? 'Hide deliveries' : 'Deliveries'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this webhook endpoint?')) void act(() => integrationApi.deleteWebhook(ep._id), 'Deleted');
                  }}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
              {expanded === ep._id && (
                <div className="mt-2 rounded-xl bg-slate-50 p-2">
                  <DeliveryLog endpointId={ep._id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ApiClientsSection({ scopes }: { scopes: string[] }) {
  const [clients, setClients] = useState<ApiClientDto[]>([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>(['read:orders', 'write:orders']);
  const [revealed, setRevealed] = useState<{ clientId: string; secret: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setClients(await integrationApi.apiClients());
    } catch {
      toast.error('Could not load API clients.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, 'Something went wrong.'));
    }
  };

  const apiBase = (envConfig.apiBaseUrl ?? '').replace(/\/api\/v1\/?$/, '');

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">API clients</h2>
        <p className="text-xs text-gray-500">
          For external POS / kitchen displays. Exchange the client id + secret at{' '}
          <code>{apiBase}/api/partner/v1/oauth/token</code> (OAuth 2.0 client credentials), then call the partner API
          with the bearer token. Full reference: <code>{apiBase}/api-docs</code> → Partner API.
        </p>
      </div>

      {revealed && (
        <SecretOnce
          label={`Client secret for ${revealed.clientId}`}
          value={revealed.secret}
          onDone={() => setRevealed(null)}
        />
      )}

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <input aria-label="Client name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen display" className={inputClass} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Scopes">
          {scopes.map((s) => {
            const on = picked.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(on ? picked.filter((x) => x !== s) : [...picked, s])}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!name.trim() || !picked.length}
          onClick={() =>
            act(async () => {
              const res = await integrationApi.createApiClient({ name: name.trim(), scopes: picked });
              setRevealed({ clientId: res.client.clientId, secret: res.clientSecret });
              setName('');
            }, 'API client created')
          }
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Create client
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-gray-500">No API clients yet.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c._id} className={`rounded-xl border border-slate-200 p-3 ${c.revokedAt ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{c.name}</p>
                  <p className="font-mono text-xs text-gray-600">
                    {c.clientId} · secret …{c.secretHint}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.scopes.join(', ')}
                    {c.lastUsedAt ? ` · last used ${new Date(c.lastUsedAt).toLocaleString()}` : ' · never used'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    c.revokedAt ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {c.revokedAt ? 'Revoked' : 'Active'}
                </span>
              </div>
              {!c.revokedAt && (
                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      act(async () => {
                        const res = await integrationApi.rotateApiClient(c._id);
                        setRevealed({ clientId: res.client.clientId, secret: res.clientSecret });
                      }, 'Secret rotated')
                    }
                    className="text-slate-700"
                  >
                    Rotate secret
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Revoke ${c.name}? Its tokens stop working within a minute.`)) {
                        void act(() => integrationApi.revokeApiClient(c._id), 'Revoked');
                      }
                    }}
                    className="text-red-600"
                  >
                    Revoke
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Phase 9: Settings → Integrations (webhooks + partner API clients). */
export default function IntegrationsPage() {
  const [meta, setMeta] = useState<{ topics: string[]; scopes: string[] } | null>(null);
  useEffect(() => {
    integrationApi
      .meta()
      .then(setMeta)
      .catch(() => toast.error('Integrations are available to managers only.'));
  }, []);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title="Integrations"
        subtitle="Connect an external POS, kitchen display or property system to Rhace."
      />
      {!meta ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <>
          <WebhooksSection topics={meta.topics} />
          <ApiClientsSection scopes={meta.scopes} />
        </>
      )}
    </div>
  );
}
