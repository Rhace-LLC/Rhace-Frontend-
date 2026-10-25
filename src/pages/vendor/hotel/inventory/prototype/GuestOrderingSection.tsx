import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Card } from '@/components/ui/card';
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
 */
const GuestOrderingSection = () => {
  const [settings, setSettings] = useState<GuestOrderingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<FloorPlanDto[]>([]);
  const [planId, setPlanId] = useState('');
  const [qrs, setQrs] = useState<RoomQr[]>([]);
  const [generating, setGenerating] = useState(false);

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
      setQrs(await stayService.bulkRoomQr(planId));
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
      toast.success('QR rotated — old prints stop working');
    } catch {
      toast.error('Failed to rotate the QR code');
    }
  };

  return (
    <Card className="rounded-res-lg border border-res-line bg-res-card p-6 shadow-res-low md:p-8">
      <h2 className="type-res-h2 text-res-ink">Guest ordering</h2>
      <p className="mt-1 type-res-small text-res-ink-muted">
        Room QR codes, the guest challenge and the room-tab credit limit.
      </p>

      {settings && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface p-3 type-res-small text-res-ink">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="rounded border-res-line text-res-brand focus:ring-res-brand"
            />
            Enable guest ordering at this property
          </label>
          <label className="type-res-small text-res-ink">
            Challenge method
            <select
              value={settings.challengeMode}
              onChange={(e) =>
                update({ challengeMode: e.target.value as GuestOrderingSettings['challengeMode'] })
              }
              className="mt-1 w-full rounded-res-sm border border-res-line bg-res-card px-3 py-2 focus:ring-2 focus:ring-res-brand focus:border-res-brand outline-none"
            >
              <option value="either">Last name or PIN</option>
              <option value="lastName">Last name only</option>
              <option value="pin">Guest PIN only</option>
            </select>
          </label>
          <label className="type-res-small text-res-ink">
            Default credit limit
            <Input
              type="number"
              min={0}
              value={settings.defaultCreditLimit}
              onChange={(e) => update({ defaultCreditLimit: Number(e.target.value) })}
              className="mt-1"
            />
          </label>
          <label className="type-res-small text-res-ink">
            KDS acceptance timeout (minutes)
            <Input
              type="number"
              min={1}
              value={settings.acceptanceTimeoutMins}
              onChange={(e) => update({ acceptanceTimeoutMins: Number(e.target.value) })}
              className="mt-1"
            />
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving || !settings}
        className="type-res-small mt-4 inline-flex cursor-pointer items-center rounded-full bg-res-brand px-6 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-all outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save guest ordering'}
      </button>

      <div className="mt-8 border-t border-res-line pt-6">
        <h3 className="font-semibold text-res-ink">Room QR codes</h3>
        <p className="mt-1 type-res-small text-res-ink-muted">
          Print one per room. Guests scan to open <span className="font-mono">/stay/:token</span>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-res-sm border border-res-line bg-res-card px-3 py-2 type-res-small text-res-ink focus:ring-2 focus:ring-res-brand focus:border-res-brand outline-none"
          >
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={generate}
            disabled={generating || !planId}
            className="type-res-small inline-flex cursor-pointer items-center rounded-full bg-res-ink px-5 py-2 font-semibold text-res-ink-inverted transition-colors outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-wait disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate QR codes'}
          </button>
          {qrs.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="type-res-small inline-flex cursor-pointer items-center rounded-full bg-res-surface px-5 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
            >
              Print sheet
            </button>
          )}
        </div>
        {qrs.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {qrs.map((q) => (
              <div
                key={q.unitId}
                className="flex flex-col items-center gap-1 rounded-res-sm border border-res-line bg-res-card p-3"
              >
                <QrCode value={`${window.location.origin}${q.path}`} size={128} label={q.label} />
                <button
                  type="button"
                  onClick={() => rotate(q.unitId)}
                  className="mt-1 text-xs font-semibold text-red-600"
                >
                  Rotate (invalidate)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default GuestOrderingSection;
