import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Lock, Plus, RefreshCw, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getRevenueSettings, updateRevenueSettings, type RevenueSettings } from '@/services/admin.service';
import { billingService, type SubscriptionPlanDto } from '@/services/billing.service';

const naira = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

const VERTICALS: { value: string; label: string }[] = [
  { value: '', label: 'All venues' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'club', label: 'Clubs' },
];

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const parseCohort = (raw: string) => [
  ...new Set(
    raw
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
  ),
];

const EMPTY_FORM = { name: '', amount: '', vertical: '', minTermMonths: '3', graceDays: '7', cooldownDays: '60' };

/**
 * Vendor subscription plans and availability (proposal §2.6). Plans are
 * insert-only: a price change is a new plan, and old plans are deactivated,
 * never edited or deleted, so subscribers keep the price they signed up at.
 * Availability is the kill-switch plus the pilot cohort; active subscribers
 * are always honoured whatever these are set to (D12).
 */
export default function SubscriptionPlansCard() {
  const { admin } = useAuth();
  const isSuperadmin = admin?.role === 'superadmin';

  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [revenue, setRevenue] = useState<RevenueSettings | null>(null);
  const [termsVersion, setTermsVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<SubscriptionPlanDto | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [cohortInput, setCohortInput] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, r] = await Promise.all([billingService.adminListPlans(), getRevenueSettings()]);
      setPlans(p.data);
      setTermsVersion(p.termsVersion);
      setRevenue(r.data);
      setEnabled(r.data.subscriptionEnabled);
      setCohortInput((r.data.subscriptionCohort ?? []).join('\n'));
    } catch {
      toast.error('Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cohort = useMemo(() => parseCohort(cohortInput), [cohortInput]);
  const availabilityDirty =
    !!revenue &&
    (enabled !== revenue.subscriptionEnabled ||
      cohort.join(',') !== (revenue.subscriptionCohort ?? []).join(','));
  const invalidIds = cohort.filter((id) => !/^[a-f0-9]{24}$/i.test(id));

  const amount = Number(form.amount);
  const formValid =
    form.name.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Number(form.minTermMonths) >= 1 &&
    Number(form.graceDays) >= 0 &&
    Number(form.cooldownDays) >= 0;

  const createPlan = async () => {
    if (!formValid) return;
    setCreating(true);
    try {
      await billingService.adminCreatePlan({
        name: form.name.trim(),
        amount,
        vertical: form.vertical || null,
        minTermMonths: Math.floor(Number(form.minTermMonths)),
        graceDays: Math.floor(Number(form.graceDays)),
        cooldownDays: Math.floor(Number(form.cooldownDays)),
      });
      toast.success('Plan created.');
      setForm(EMPTY_FORM);
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the plan.'));
    } finally {
      setCreating(false);
    }
  };

  const deactivate = async () => {
    if (!deactivating) return;
    try {
      await billingService.adminDeactivatePlan(deactivating._id);
      toast.success(`${deactivating.name} is no longer offered.`);
      setDeactivating(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not deactivate the plan.'));
    }
  };

  const saveAvailability = async () => {
    if (!revenue || invalidIds.length > 0) return;
    setSavingAvailability(true);
    try {
      // Same superadmin endpoint as the revenue card, sending the current
      // revenue values unchanged; the version guards against a concurrent edit.
      const res = await updateRevenueSettings({
        platformPercentage: revenue.platformPercentage,
        feeBearer: revenue.feeBearer,
        version: revenue.version,
        activeProvider: revenue.activeProvider,
        providerFallback: revenue.providerFallback,
        stripeEnabled: revenue.stripeEnabled,
        subscriptionEnabled: enabled,
        subscriptionCohort: cohort,
      });
      // The PUT response is partial; merge, then refetch for the full view.
      const next = { ...revenue, ...res.data };
      setRevenue(next);
      setEnabled(next.subscriptionEnabled);
      setCohortInput((next.subscriptionCohort ?? []).join('\n'));
      void load();
      toast.success('Subscription availability saved.');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 409
          ? 'Revenue settings changed in another tab. Reloaded the latest values; review and save again.'
          : errorMessage(err, 'Could not save availability.')
      );
      if (status === 409) await load();
    } finally {
      setSavingAvailability(false);
    }
  };

  const active = plans.filter((p) => p.isActive !== false);
  const inactive = plans.filter((p) => p.isActive === false);

  return (
    <Card className="p-5 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Vendor subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Flat monthly plans as an alternative to the platform percentage. Subscribed venues keep 100% of NGN
            payments minus processing fees. Terms version {termsVersion || '—'}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!isSuperadmin && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          View only. A superadmin manages plans and availability.
        </div>
      )}

      {/* Availability */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-semibold">Open to all venues</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Off: only the pilot venues below can subscribe. Turning this off never ends existing subscriptions;
              they run to the end of their paid period.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!isSuperadmin || loading} />
        </div>
        <div>
          <Label htmlFor="sub-cohort" className="text-sm font-semibold">
            Pilot venues ({cohort.length})
          </Label>
          <p className="text-xs text-muted-foreground mt-1">Venue IDs, one per line. Used while the switch is off.</p>
          <Textarea
            id="sub-cohort"
            value={cohortInput}
            onChange={(e) => setCohortInput(e.target.value)}
            disabled={!isSuperadmin || loading}
            rows={3}
            className="mt-2 font-mono text-xs"
            placeholder="64b0f1c2a9e4d1b2c3d4e5f6"
          />
          {invalidIds.length > 0 && (
            <p className="text-xs text-red-600 mt-1">Not a valid venue ID: {invalidIds.join(', ')}</p>
          )}
        </div>
        {isSuperadmin && (
          <Button
            size="sm"
            onClick={() => void saveAvailability()}
            disabled={!availabilityDirty || savingAvailability || invalidIds.length > 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {savingAvailability ? 'Saving…' : 'Save availability'}
          </Button>
        )}
      </div>

      <Separator />

      {/* Plans */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Plans</h3>
          {isSuperadmin && !formOpen && (
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New plan
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          To change a price, create a new plan and deactivate the old one. Existing subscribers keep the price they
          subscribed at.
        </p>

        {formOpen && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Hotel monthly"
                />
              </div>
              <div>
                <Label htmlFor="plan-amount">Monthly price (₦)</Label>
                <Input
                  id="plan-amount"
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plan-vertical">Venue type</Label>
                <select
                  id="plan-vertical"
                  value={form.vertical}
                  onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                >
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="plan-term">Prepaid first term (months)</Label>
                <Input
                  id="plan-term"
                  type="number"
                  min={1}
                  value={form.minTermMonths}
                  onChange={(e) => setForm({ ...form, minTermMonths: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plan-grace">Grace (days)</Label>
                <Input
                  id="plan-grace"
                  type="number"
                  min={0}
                  value={form.graceDays}
                  onChange={(e) => setForm({ ...form, graceDays: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plan-cooldown">Wait to rejoin (days)</Label>
                <Input
                  id="plan-cooldown"
                  type="number"
                  min={0}
                  value={form.cooldownDays}
                  onChange={(e) => setForm({ ...form, cooldownDays: e.target.value })}
                />
              </div>
            </div>
            {formValid && (
              <p className="text-xs text-muted-foreground">
                First invoice: {naira(amount * Number(form.minTermMonths))} for {form.minTermMonths} months, then{' '}
                {naira(amount)} monthly. Price from the pricing worksheet, not a guess.
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void createPlan()} disabled={!formValid || creating}>
                {creating ? 'Creating…' : 'Create plan'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {plans.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No plans yet. Venues cannot subscribe until one exists.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Monthly</th>
                  <th className="px-3 py-2 font-medium">First invoice</th>
                  <th className="px-3 py-2 font-medium">Venue type</th>
                  <th className="px-3 py-2 font-medium">Grace / rejoin</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...active, ...inactive].map((p) => (
                  <tr key={p._id} className={`border-t ${p.isActive === false ? 'text-muted-foreground' : ''}`}>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5">{naira(p.amount)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {naira(p.amount * p.minTermMonths)} · {p.minTermMonths} mo
                    </td>
                    <td className="px-3 py-2.5 capitalize">{p.vertical ?? 'All'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {p.graceDays}d / {p.cooldownDays}d
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.isActive === false ? 'Inactive' : 'Offered'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isSuperadmin && p.isActive !== false && (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivating(p)}>
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop offering {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              New venues can no longer choose this plan. Current subscribers are not affected: their renewals keep
              the price they subscribed at. This cannot be undone; create a new plan to offer it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep offering</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void deactivate()}>
              Deactivate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
