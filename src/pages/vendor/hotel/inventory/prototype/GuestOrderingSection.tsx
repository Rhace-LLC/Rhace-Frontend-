import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CreditCard,
  QrCode as QrCodeIcon,
  ShieldCheck,
  Clock,
  Printer,
  RefreshCcw,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode } from '@/components/ui/qr-code';
import { floorPlanService } from '@/services/floorPlan.service';
import {
  stayService,
  type GuestOrderingSettings,
  type RoomQr,
} from '@/services/stay.service';
import type { FloorPlanDto } from '@/types';

/**
 * Phase 1 hotel settings: guest-ordering feature flag + challenge/credit
 * configuration, plus room QR generation/printing per floor plan.
 *
 * Modern minimalist design: solid surfaces, pill buttons, full-width inputs,
 * plain-English labels, no glassmorphism.
 */
const CHALLENGE_LABELS: Record<string, string> = {
  either: 'Last name or PIN',
  lastName: 'Last name only',
  pin: 'Guest PIN only',
};

const STATUS_BADGE: Record<string, string> = {
  enabled: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  disabled: 'bg-slate-50 text-slate-700 border-slate-100',
};

const inputClass =
  'w-full rounded-res-md border border-res-line bg-res-card px-3 py-2.5 text-res-ink placeholder:text-res-ink-muted focus:border-res-brand focus:ring-res-brand/20';

const selectClass =
  'w-full rounded-res-md border border-res-line bg-res-card px-3 py-2.5 text-res-ink focus:border-res-brand focus:ring-res-brand/20 outline-none';

const formatGeneratedAt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const QrCard = ({
  q,
  isSelected,
  toggleSelect,
  rotate,
}: {
  q: RoomQr;
  isSelected: boolean;
  toggleSelect: (id: string) => void;
  rotate: (id: string) => void;
}) => {
  return (
    <div
      key={q.unitId}
      className={`rounded-res-md border p-4 shadow-res-low transition-colors ${
        isSelected
          ? 'bg-res-brand/5 border-res-brand ring-1 ring-res-brand'
          : 'bg-res-card border-res-line hover:bg-res-surface hover:border-res-brand/20'
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-res-card border border-res-line p-2">
          <QrCode value={`${window.location.origin}${q.path}`} size={96} label={q.label} />
        </div>
        <div className="text-center">
          <p className="type-res-body text-res-ink font-medium">{q.label}</p>
          <p className="type-res-small text-res-ink-muted">Room QR</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(q.unitId)}
            className="rounded border-res-line text-res-brand focus:ring-res-brand"
          />
          <span className="type-res-small text-res-ink-muted">
            Generated {formatGeneratedAt(q.generatedAt)}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            rotate(q.unitId);
          }}
          className="rounded-full border border-res-line bg-res-card px-3 py-1.5 text-res-ink text-xs font-medium shadow-res-low hover:bg-res-surface"
        >
          <RefreshCcw className="size-3.5 mr-1" />
          Rotate
        </button>
      </div>
    </div>
  );
};

const GuestOrderingSection = () => {
  const [settings, setSettings] = useState<GuestOrderingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [qrs, setQrs] = useState<RoomQr[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedQrs, setSelectedQrs] = useState<Set<string>>(new Set());
  const [bulkRotating, setBulkRotating] = useState(false);

  useEffect(() => {
    stayService.getSettings().then(setSettings).catch(() => null);
    floorPlanService
      .list()
      .then((res) => {
        const docs = res.data?.items ?? [];
        setPlans(docs);
        if (docs.length > 0) setPlanId(docs[0]._id);
      })
      .catch(() => null);
  }, []);

  // Load existing QRs whenever the floor plan changes.
  const loadQrs = useCallback(async () => {
    if (!planId) {
      setQrs([]);
      return;
    }
    try {
      const rows = await stayService.listRoomQrs(planId);
      setQrs(rows);
    } catch {
      setQrs([]);
    }
  }, [planId]);

  useEffect(() => {
    void loadQrs();
  }, [loadQrs]);

  const update = (patch: Partial<GuestOrderingSettings>) =>
    setSettings((s) => (s ? { ...s, ...patch } : s));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await stayService.updateSettings(settings);
      setSettings(saved);
      toast.success('Guest ordering settings saved');
    } catch {
      toast.error('Failed to save guest ordering settings');
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!planId) return;
    setGenerating(true);
    try {
      const rows = await stayService.bulkRoomQr(planId);
      setQrs(rows);
      setSelectedQrs(new Set());
      toast.success('Room QR codes generated');
    } catch {
      toast.error('Failed to generate room QR codes');
    } finally {
      setGenerating(false);
    }
  };

  const rotate = async (unitId: string) => {
    try {
      const next = await stayService.rotateRoomQr(unitId);
      setQrs((list) => list.map((q) => (q.unitId === unitId ? { ...q, ...next } : q)));
      setSelectedQrs((prev) => { const n = new Set(prev); n.delete(unitId); return n; });
      toast.success('QR rotated — old prints stop working');
    } catch {
      toast.error('Failed to rotate the QR code');
    }
  };

  const bulkRotate = async () => {
    const ids = Array.from(selectedQrs);
    if (ids.length === 0) return;
    setBulkRotating(true);
    try {
      const rows = await stayService.bulkRotateRoomQrs(ids);
      setQrs((list) =>
        list.map((q) => {
          const updated = rows.find((r) => r.unitId === q.unitId);
          return updated ? { ...q, ...updated } : q;
        }),
      );
      setSelectedQrs(new Set());
      toast.success(`${ids.length} QR code${ids.length === 1 ? '' : 's'} rotated`);
    } catch {
      toast.error('Failed to rotate QR codes');
    } finally {
      setBulkRotating(false);
    }
  };

  const toggleSelect = (unitId: string) => {
    setSelectedQrs((prev) => {
      const n = new Set(prev);
      if (n.has(unitId)) n.delete(unitId);
      else n.add(unitId);
      return n;
    });
  };

  const selectAll = () => {
    setSelectedQrs(new Set(qrs.map((q) => q.unitId)));
  };

  const clearSelection = () => {
    setSelectedQrs(new Set());
  };

  const challengeModeLabel = settings?.challengeMode ? CHALLENGE_LABELS[settings.challengeMode] : 'Last name or PIN';
  const hasSelection = selectedQrs.size > 0;
  const allSelected = qrs.length > 0 && selectedQrs.size === qrs.length;

  return (
    <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <CardTitle className="type-res-body text-res-ink font-semibold">Stay QR & guest ordering</CardTitle>
        <CardDescription className="type-res-small text-res-ink-muted">
          Configure guest ordering, challenge method, room-tab credit, and print room QR codes.
        </CardDescription>
      </div>

      {/* Settings */}
      {settings && (
        <div className="rounded-res-md border border-res-line bg-res-surface p-5 mb-6">
          <CardTitle className="type-res-small text-res-ink-muted uppercase tracking-wider mb-4">
            Ordering settings
          </CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Enable toggle */}
            <div className="flex items-center gap-3 rounded-res-md border border-res-line bg-res-card p-3 cursor-pointer transition-colors hover:bg-res-surface">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                className="rounded border-res-line text-res-brand focus:ring-res-brand"
              />
              <div>
                <p className="type-res-body text-res-ink font-medium">Enable guest ordering</p>
                <p className="type-res-small text-res-ink-muted">
                  Guests can scan room QR codes to order and view their bill.
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${settings.enabled ? STATUS_BADGE.enabled : STATUS_BADGE.disabled}`}
              >
                {settings.enabled ? 'On' : 'Off'}
              </span>
            </div>

            {/* Challenge method */}
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">
                Challenge method
              </label>
              <select
                value={settings.challengeMode}
                onChange={(e) =>
                  update({ challengeMode: e.target.value as GuestOrderingSettings['challengeMode'] })
                }
                className={selectClass}
              >
                <option value="either">{CHALLENGE_LABELS.either}</option>
                <option value="lastName">{CHALLENGE_LABELS.lastName}</option>
                <option value="pin">{CHALLENGE_LABELS.pin}</option>
              </select>
              <p className="type-res-small text-res-ink-muted">
                Guests verify with {challengeModeLabel.toLowerCase()}.
              </p>
            </div>

            {/* Credit limit */}
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">
                Default credit limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-res-ink-muted type-res-small">
                  ₦
                </span>
                <Input
                  type="number"
                  min={0}
                  value={settings.defaultCreditLimit}
                  onChange={(e) => update({ defaultCreditLimit: Number(e.target.value) })}
                  className={`${inputClass} pl-8`}
                />
              </div>
              <p className="type-res-small text-res-ink-muted">
                Starting room-tab credit for new stays.
              </p>
            </div>

            {/* KDS timeout */}
            <div className="flex flex-col gap-1">
              <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">
                KDS acceptance timeout
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={settings.acceptanceTimeoutMins}
                  onChange={(e) => update({ acceptanceTimeoutMins: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <p className="type-res-small text-res-ink-muted">
                Minutes before a kitchen ticket is flagged late.
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-res-md bg-res-brand px-4 py-2.5 font-medium text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

      {/* Room QR codes */}
      <div className="rounded-res-md border border-res-line bg-res-surface p-5">
        <CardTitle className="type-res-small text-res-ink-muted uppercase tracking-wider mb-4">
          Room QR codes
        </CardTitle>
        <CardDescription className="type-res-small text-res-ink-muted mb-4">
          Print one per room. Guests scan to open their stay page.
        </CardDescription>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="type-res-small text-res-ink-muted uppercase tracking-wider block">
              Floor plan
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={selectClass}
            >
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating || !planId}
            className="rounded-res-md bg-res-brand px-4 py-2.5 font-medium text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate QR codes'}
          </button>
          {qrs.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface"
            >
              <Printer className="size-4 mr-2" />
              Print sheet
            </button>
          )}
          {hasSelection && (
            <button
              type="button"
              onClick={bulkRotate}
              disabled={bulkRotating}
              className="rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface disabled:opacity-60"
            >
              <RefreshCcw className="size-4 mr-2" />
              Rotate {hasSelection ? selectedQrs.size : 0}
            </button>
          )}
          {hasSelection && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-res-md border border-res-line bg-res-card px-4 py-2.5 font-medium text-res-ink shadow-res-low hover:bg-res-surface"
            >
              Clear selection
            </button>
          )}
        </div>

        {qrs.length === 0 ? (
          <div className="rounded-res-md border border-dashed border-res-line bg-res-card p-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-res-surface mb-3">
              <QrCodeIcon className="h-6 w-6 text-res-ink-muted" />
            </div>
            <h3 className="type-res-h3 text-res-ink">No QR codes yet</h3>
            <p className="mt-2 type-res-body text-res-ink-muted max-w-sm mx-auto">
              Select a floor plan and generate QR codes for your rooms.
            </p>
          </div>
        ) : (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selectAll}
                  className="rounded border-res-line text-res-brand focus:ring-res-brand"
                />
                <span className="type-res-small text-res-ink font-medium">
                  {hasSelection ? `${selectedQrs.size} of ${qrs.length} selected` : 'Select rooms'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {qrs.map((q) => {
                const isSelected = selectedQrs.has(q.unitId);
                return (
                  <div
                    key={q.unitId}
                    className={`rounded-res-md border p-4 shadow-res-low transition-colors ${
                      isSelected
                        ? 'bg-res-brand/5 border-res-brand ring-1 ring-res-brand'
                        : 'bg-res-card border-res-line hover:bg-res-surface hover:border-res-brand/20'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-res-card border border-res-line p-2">
                        <QrCode value={`${window.location.origin}${q.path}`} size={96} label={q.label} />
                      </div>
                      <div className="text-center">
                        <p className="type-res-body text-res-ink font-medium">{q.label}</p>
                        <p className="type-res-small text-res-ink-muted">Room QR</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(q.unitId)}
                          className="rounded border-res-line text-res-brand focus:ring-res-brand"
                        />
                        <span className="type-res-small text-res-ink-muted">
                          Generated {formatGeneratedAt(q.generatedAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotate(q.unitId);
                        }}
                        className="rounded-full border border-res-line bg-res-card px-3 py-1.5 text-res-ink text-xs font-medium shadow-res-low hover:bg-res-surface"
                      >
                        <RefreshCcw className="size-3.5 mr-1" />
                        Rotate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default GuestOrderingSection;
