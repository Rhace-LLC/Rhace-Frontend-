import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock, RefreshCw, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  getProviderCoverage,
  getRevenueSettings,
  updateRevenueSettings,
  type FeeBearer,
  type PaymentProviderId,
  type PaymentProviderInfo,
  type ProviderCoverage,
  type RevenueSettings,
} from '@/services/admin.service';

const MAX_PLATFORM_PERCENTAGE = 30;
const EXAMPLE_AMOUNT = 100_000;
const FEE_BEARERS: FeeBearer[] = ['customer', 'vendor', 'platform', 'split'];

const BEARER_OPTIONS: { value: FeeBearer; label: string; description: string }[] = [
  {
    value: 'customer',
    label: 'Customer',
    description:
      "Vendor and platform keep their full share. The fee is passed to the customer through the provider account's charges setting.",
  },
  {
    value: 'vendor',
    label: 'Vendor',
    description: "The gateway fee is deducted from the vendor's share.",
  },
  {
    value: 'platform',
    label: 'Platform',
    description: 'The platform absorbs the gateway fee out of its own share.',
  },
  {
    value: 'split',
    label: 'Split 50/50',
    description:
      'Vendor and platform each absorb half. Only Monnify can settle this, so it needs Monnify as the only provider (fallback off).',
  },
];

const naira = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Local-card estimate: 1.5% + ₦100 (₦100 waived under ₦2,500), capped at ₦2,000. */
const estimateGatewayFee = (amount: number) =>
  Math.min(amount * 0.015 + (amount >= 2500 ? 100 : 0), 2000);

/** Returns the parsed percentage, or an error message. Mirrors the server rules. */
function parsePlatform(raw: string): { value: number } | { error: string } {
  if (raw.trim() === '') return { error: 'Enter a percentage.' };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { error: 'Enter a number.' };
  if (value < 0 || value > MAX_PLATFORM_PERCENTAGE)
    return { error: `Must be between 0 and ${MAX_PLATFORM_PERCENTAGE}.` };
  if (Math.round(value * 100) !== value * 100) return { error: 'At most 2 decimal places.' };
  return { value };
}

function splitExample(amount: number, platformPct: number, bearer: FeeBearer) {
  const fee = estimateGatewayFee(amount);
  const vendorShare = (amount * (100 - platformPct)) / 100;
  const platformShare = (amount * platformPct) / 100;
  const vendorFee = bearer === 'vendor' ? fee : bearer === 'split' ? fee / 2 : 0;
  const platformFee = bearer === 'platform' ? fee : bearer === 'split' ? fee / 2 : 0;
  return {
    fee,
    vendorNet: vendorShare - vendorFee,
    platformNet: platformShare - platformFee,
  };
}

/**
 * Same rule as the server: without gateway parity only "customer"; otherwise
 * the bearers every provider a payment could be routed to can settle.
 */
function selectableBearers(
  data: RevenueSettings,
  active: PaymentProviderId,
  fallback: boolean
): FeeBearer[] {
  if (!data.gatewayBearerParity) return ['customer'];
  // NGN rails only: Stripe is currency-routed, never part of the NGN fallback set.
  const ngnRails = data.providers.filter((p) => (p.currencies ?? ['NGN']).includes('NGN'));
  const routable = ngnRails.filter((p) => p.id === active || (fallback && p.configured));
  return FEE_BEARERS.filter((b) => routable.every((p) => p.supportedFeeBearers.includes(b)));
}

/** NGN rails take the active-provider radio; Stripe is currency-routed (own section below). */
const ngnProviders = (data: RevenueSettings) =>
  data.providers.filter((p) => (p.currencies ?? ['NGN']).includes('NGN'));
const stripeProvider = (data: RevenueSettings) =>
  data.providers.find((p) => p.id === 'stripe');

const bearerLabel = (b: FeeBearer) => BEARER_OPTIONS.find((o) => o.value === b)?.label ?? b;
const providerLabel = (data: RevenueSettings, id: PaymentProviderId | undefined) =>
  data.providers.find((p) => p.id === id)?.label ?? id ?? '—';

const errorStatus = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;
const errorMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

/** Vendors not yet set up on a provider, loaded on demand. */
function CoverageList({ provider }: { provider: PaymentProviderInfo }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ProviderCoverage['missing'] | null>(null);
  const [failed, setFailed] = useState(false);
  const missing = provider.vendorCoverage.total - provider.vendorCoverage.ready;
  if (missing <= 0) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && list === null) {
      try {
        const res = await getProviderCoverage(provider.id);
        setList(res.data.missing);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }
  };

  return (
    <div className="pl-7">
      <button
        type="button"
        className="text-xs text-primary underline-offset-2 hover:underline"
        onClick={() => void toggle()}
      >
        {open ? 'Hide' : 'Show'} {missing} vendor{missing === 1 ? '' : 's'} not ready on{' '}
        {provider.label}
      </button>
      {open && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border text-xs">
          {failed && <p className="p-3 text-destructive">Couldn't load the list.</p>}
          {!failed && list === null && <p className="p-3 text-muted-foreground">Loading…</p>}
          {list?.map((v) => (
            <div key={v.id} className="border-b last:border-b-0 p-2">
              <p className="font-medium">{v.businessName}</p>
              <p className="text-muted-foreground">
                {v.bankName ?? 'Unknown bank'}
                {v.lastError ? ` · ${v.lastError}` : ' · not attempted yet'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Platform revenue split and payment provider. Saved through its own
 * superadmin-only endpoint (PUT /settings/revenue) with optimistic
 * concurrency, never through the page-wide settings save, so another tab
 * can't silently revert it.
 */
export default function RevenueSplitCard() {
  const { admin } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();
  const isSuperadmin = admin?.role === 'superadmin';

  const [data, setData] = useState<RevenueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [platformInput, setPlatformInput] = useState('');
  const [bearer, setBearer] = useState<FeeBearer>('customer');
  const [provider, setProvider] = useState<PaymentProviderId>('paystack');
  const [fallback, setFallback] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyServerState = useCallback((next: RevenueSettings) => {
    setData(next);
    setPlatformInput(String(next.platformPercentage));
    setBearer(next.feeBearer);
    setProvider(next.activeProvider === 'stripe' ? 'paystack' : next.activeProvider);
    setFallback(next.providerFallback);
    setStripeEnabled(next.stripeEnabled);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRevenueSettings();
      applyServerState(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        errorStatus(err) === 503
          ? 'Revenue settings are not configured. Payments are blocked until they are.'
          : 'Failed to load revenue settings.'
      );
    } finally {
      setLoading(false);
    }
  }, [applyServerState]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = parsePlatform(platformInput);
  const platformPct = 'value' in parsed ? parsed.value : null;
  const dirty =
    !!data &&
    (platformPct !== data.platformPercentage ||
      bearer !== data.feeBearer ||
      provider !== data.activeProvider ||
      fallback !== data.providerFallback ||
      stripeEnabled !== data.stripeEnabled);

  // Another superadmin saved: reload. Warn if this edit is being discarded.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    subscribe('revenue_settings_updated', () => {
      if (dirtyRef.current) {
        toast.info('Revenue settings were changed by someone else. Reloaded the latest values.');
      }
      void load();
    });
    return () => unsubscribe('revenue_settings_updated');
  }, [subscribe, unsubscribe, load]);

  const selectable = data ? selectableBearers(data, provider, fallback) : ['customer'];
  const bearerInvalid = !selectable.includes(bearer);
  const canEdit = isSuperadmin && !!data;

  const example = useMemo(
    () => splitExample(EXAMPLE_AMOUNT, platformPct ?? data?.platformPercentage ?? 0, bearer),
    [platformPct, data?.platformPercentage, bearer]
  );

  const save = async () => {
    if (!data || platformPct === null) return;
    try {
      setSaving(true);
      const res = await updateRevenueSettings({
        platformPercentage: platformPct,
        feeBearer: bearer,
        activeProvider: provider,
        providerFallback: fallback,
        stripeEnabled,
        version: data.version,
      });
      // The PUT response omits updatedByName; refetch for the full view.
      applyServerState({ ...data, ...res.data });
      void load();
      toast.success('Settings saved. They apply to new payments.');
      setConfirmOpen(false);
    } catch (err) {
      if (errorStatus(err) === 409) {
        toast.error('Someone else changed these settings. Reloaded the latest values.');
        setConfirmOpen(false);
        void load();
      } else {
        toast.error(errorMessage(err) ?? 'Failed to save revenue settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <Card className="rounded-res-lg border border-res-line bg-res-card p-6 shadow-res-low">
        <p className="text-sm text-muted-foreground">Loading revenue settings…</p>
      </Card>
    );
  }

  if (loadError && !data) {
    return (
      <Card className="rounded-res-lg border border-res-line bg-res-card p-6 shadow-res-low space-y-3">
        <h3 className="font-semibold">Revenue split &amp; payment provider</h3>
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const vendorPctDisplay =
    platformPct === null ? '—' : `${Math.round((100 - platformPct) * 100) / 100}%`;
  const providerChanged = provider !== data.activeProvider || fallback !== data.providerFallback;
  const stripeChanged = stripeEnabled !== data.stripeEnabled;
  const stripe = stripeProvider(data);

  return (
    <Card className="rounded-res-lg border border-res-line bg-res-card p-6 shadow-res-low">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="font-semibold">Revenue split &amp; payment provider</h3>
        <Badge variant={data.source === 'db' ? 'secondary' : 'destructive'}>
          {data.source === 'db' ? 'Saved settings' : 'Environment fallback'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Which payment provider takes new payments, the platform's cut of every payment, and who
        absorbs the gateway fee. Changes apply to payments started after you save. Pending and past
        payments keep the provider and rate they started with.
      </p>

      {!isSuperadmin && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 mb-6 text-sm">
          <Lock className="h-4 w-4 shrink-0" />
          Only a super admin can change these settings.
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-3">
          <Label>Naira payment provider for new payments</Label>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as PaymentProviderId)}
            disabled={!canEdit || saving}
          >
            {ngnProviders(data).map((p) => {
              const id = `provider-${p.id}`;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem
                      id={id}
                      value={p.id}
                      disabled={!canEdit || saving || !p.configured}
                      className="mt-0.5"
                    />
                    <Label htmlFor={id} className="flex-col items-start gap-0.5 font-normal">
                      <span
                        className={
                          p.configured ? 'font-medium' : 'font-medium text-muted-foreground'
                        }
                      >
                        {p.label}
                        {!p.configured && (
                          <span className="ml-2 text-xs font-normal">
                            (API keys not set on the server)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.vendorCoverage.ready} of {p.vendorCoverage.total} vendors ready
                      </span>
                    </Label>
                  </div>
                  <CoverageList provider={p} />
                </div>
              );
            })}
          </RadioGroup>
          <div className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="provider-fallback">Fall back to another provider</Label>
              <p className="text-xs text-muted-foreground">
                If a vendor isn't set up on the active provider, take the payment through another
                configured one instead of blocking checkout.
              </p>
            </div>
            <Switch
              id="provider-fallback"
              checked={fallback}
              onCheckedChange={setFallback}
              disabled={!canEdit || saving}
            />
          </div>
          {stripe && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="stripe-enabled">Foreign-currency payments (Stripe)</Label>
                  <p className="text-xs text-muted-foreground">
                    {stripe.currencies.length > 0
                      ? `Takes ${stripe.currencies.join(', ')} checkouts automatically; naira keeps using the provider above.`
                      : 'Not connected yet: set the Stripe keys on the server first.'}{' '}
                    Turning this off stops new foreign-currency checkouts; payments already
                    started still settle.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stripe.configured ? 'Keys configured' : 'Keys not configured'} ·{' '}
                    {stripe.vendorCoverage.ready} of {stripe.vendorCoverage.total} vendors
                    Connect-ready
                  </p>
                </div>
                <Switch
                  id="stripe-enabled"
                  checked={stripeEnabled}
                  onCheckedChange={setStripeEnabled}
                  disabled={!canEdit || saving || !stripe.configured}
                />
              </div>
              <CoverageList provider={stripe} />
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="platform-percentage">Platform share (%)</Label>
            <Input
              id="platform-percentage"
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_PLATFORM_PERCENTAGE}
              step={0.5}
              className="max-w-32"
              value={platformInput}
              onChange={(e) => setPlatformInput(e.target.value)}
              disabled={!canEdit || saving}
              aria-invalid={'error' in parsed}
            />
            {'error' in parsed ? (
              <p className="text-xs text-destructive">{parsed.error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                0–{MAX_PLATFORM_PERCENTAGE}%, up to 2 decimals.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-percentage">Vendor share (%)</Label>
            <Input
              id="vendor-percentage"
              className="max-w-32"
              value={vendorPctDisplay}
              readOnly
              disabled
            />
            <p className="text-xs text-muted-foreground">Always 100% minus the platform share.</p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Who pays the gateway fee</Label>
          <RadioGroup
            value={bearer}
            onValueChange={(v) => setBearer(v as FeeBearer)}
            disabled={!canEdit || saving}
          >
            {BEARER_OPTIONS.map((opt) => {
              const available = selectable.includes(opt.value);
              const id = `fee-bearer-${opt.value}`;
              return (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem
                    id={id}
                    value={opt.value}
                    disabled={!canEdit || saving || !available}
                    className="mt-0.5"
                  />
                  <Label htmlFor={id} className="flex-col items-start gap-0.5 font-normal">
                    <span
                      className={available ? 'font-medium' : 'font-medium text-muted-foreground'}
                    >
                      {opt.label}
                      {!available && !data.gatewayBearerParity && opt.value !== 'customer' && (
                        <span className="ml-2 text-xs font-normal">(needs a gateway update)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {bearerInvalid && (
            <p className="text-xs text-destructive">
              {bearerLabel(bearer)} isn't available with this provider setup. Pick another option.
            </p>
          )}
        </div>

        <div className="rounded-md border p-4 text-sm space-y-1">
          <p className="font-medium mb-2">Example: a {naira(EXAMPLE_AMOUNT)} payment</p>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vendor receives</span>
            <span>{naira(example.vendorNet)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Platform keeps</span>
            <span>{naira(example.platformNet)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gateway fee (estimate), paid by</span>
            <span>
              {naira(example.fee)} · {bearerLabel(bearer)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            The real fee comes from the payment provider on each payment; this estimate assumes a
            local card.
          </p>
        </div>

        {data.previous && data.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Last changed {new Date(data.updatedAt).toLocaleString()}
            {data.updatedByName ? ` by ${data.updatedByName}` : ''}: platform{' '}
            {data.previous.platformPercentage}% → {data.platformPercentage}%, fee paid by{' '}
            {bearerLabel(data.previous.feeBearer)} → {bearerLabel(data.feeBearer)}
            {data.previous.activeProvider && data.previous.activeProvider !== data.activeProvider
              ? `, provider ${providerLabel(data, data.previous.activeProvider)} → ${providerLabel(data, data.activeProvider)}`
              : ''}
            {data.previous.stripeEnabled !== undefined && data.previous.stripeEnabled !== data.stripeEnabled
              ? `, Stripe foreign-currency ${data.previous.stripeEnabled ? 'on' : 'off'} → ${data.stripeEnabled ? 'on' : 'off'}`
              : ''}
            .
          </p>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => applyServerState(data)}
            disabled={!dirty || saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Discard changes
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!dirty || platformPct === null || bearerInvalid || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save payment settings?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {providerChanged && (
                    <>
                      Provider: {providerLabel(data, data.activeProvider)}
                      {data.providerFallback ? ' (with fallback)' : ''} →{' '}
                      {providerLabel(data, provider)}
                      {fallback ? ' (with fallback)' : ''}
                      <br />
                    </>
                  )}
                  {stripeChanged && (
                    <>
                      Stripe foreign-currency: {data.stripeEnabled ? 'on' : 'off'} →{' '}
                      {stripeEnabled ? 'on' : 'off'}
                      <br />
                    </>
                  )}
                  Platform share: {data.platformPercentage}% → {platformPct}%
                  <br />
                  Vendor share: {data.vendorPercentage}% → {vendorPctDisplay}
                  <br />
                  Fee paid by: {bearerLabel(data.feeBearer)} → {bearerLabel(bearer)}
                </p>
                <p>
                  This changes how payments are taken and how much money vendors receive. It applies
                  to payments started after you save. Payments already started stay on their
                  original provider and rate.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm and save'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
