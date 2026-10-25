import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Clock, Pause, Percent, Play, Trash2 } from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  FIELD_CLASS,
  Field,
  InsetBlock,
  MODAL_CONTENT_CLASS,
  PAGE_BODY,
  PAGE_SHELL,
  PILL_DANGER,
  PILL_PRIMARY,
  PILL_QUIET,
  StatTile,
  SurfaceCard,
} from '@/components/dashboard/res-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { money } from '@/features/orders/money';
import {
  vendorLinkApi,
  type FeeRuleDto,
  type OrderingWindowDto,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const DAY_LABEL = Object.fromEntries(DAYS.map((day) => [day.key, day.label]));

/** Radix Select cannot use "" as an item value, so "no filter" gets a token. */
const ANY = '__any__';
const fromAny = (value: string) => (value === ANY ? '' : value);

const MODE_STYLE: Record<string, { label: string; className: string }> = {
  allow: { label: 'Allows orders', className: 'bg-res-secondary text-res-brand' },
  block: { label: 'Blocks orders', className: 'bg-red-50 text-red-600' },
};

const SOURCE_LABEL: Record<string, string> = {
  hotel: 'Hotel services',
  linked: 'Linked outlets',
};

const DELIVERY_LABEL: Record<string, string> = {
  room: 'To a room',
  location: 'To a location',
};

/** Who keeps the fee — the code value must never reach the screen. */
const BENEFICIARY_LABEL: Record<string, string> = {
  hotel: 'You',
  partner: 'The outlet',
};

/** Row action inside a tinted inset: quiet, legible, no solid fills. */
const ROW_ACTION =
  'type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-res-ink-muted transition-colors outline-none hover:bg-res-card hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand disabled:pointer-events-none disabled:opacity-50';

export default function HotelOrderingRulesPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [windows, setWindows] = useState<OrderingWindowDto[]>([]);
  const [fees, setFees] = useState<FeeRuleDto[]>([]);
  const [linkFilter, setLinkFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modal states
  const [windowOpen, setWindowOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  // Window form
  const [wName, setWName] = useState('');
  const [wMode, setWMode] = useState<'allow' | 'block'>('allow');
  const [wStart, setWStart] = useState('23:00');
  const [wEnd, setWEnd] = useState('06:00');
  const [wDays, setWDays] = useState<Set<string>>(new Set(DAYS.map((d) => d.key)));
  const [wLinkFilter, setWLinkFilter] = useState<string>('');

  // Fee form
  const [fLabel, setFLabel] = useState('');
  const [fKind, setFKind] = useState<'flat' | 'percent'>('flat');
  const [fValue, setFValue] = useState('');
  const [fSource, setFSource] = useState<'hotel' | 'linked' | ''>('');
  const [fFulfillment, setFFulfillment] = useState<'room' | 'location' | ''>('');
  const [fLinkFilter, setFLinkFilter] = useState<string>('');

  const activeWindowCount = useMemo(() => windows.filter((w) => w.active).length, [windows]);

  const load = useCallback(async () => {
    try {
      const [loadedLinks, loadedWindows, loadedFees] = await Promise.all([
        vendorLinkApi.hotelLinks(),
        vendorLinkApi.windows(),
        vendorLinkApi.fees(),
      ]);
      setLinks(loadedLinks.filter((x) => x.status === 'active'));
      setWindows(loadedWindows);
      setFees(loadedFees);
    } catch {
      toast.error('Could not load ordering rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleDay = (key: string) => {
    const next = new Set(wDays);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setWDays(next);
  };

  const resetWindowForm = () => {
    setWName('');
    setWMode('allow');
    setWStart('23:00');
    setWEnd('06:00');
    setWDays(new Set(DAYS.map((d) => d.key)));
    setWLinkFilter('');
  };

  const resetFeeForm = () => {
    setFLabel('');
    setFKind('flat');
    setFValue('');
    setFSource('');
    setFFulfillment('');
    setFLinkFilter('');
  };

  const createWindow = async () => {
    if (!wName.trim()) {
      toast.error('Give the window a name.');
      return;
    }
    if (wDays.size === 0) {
      toast.error('Pick at least one day.');
      return;
    }
    setBusy(true);
    try {
      await vendorLinkApi.createWindow({
        name: wName.trim(),
        mode: wMode,
        start: wStart,
        end: wEnd,
        days: [...wDays],
        ...(wLinkFilter ? { vendorLink: wLinkFilter } : {}),
      });
      toast.success('Window added.');
      resetWindowForm();
      setWindowOpen(false);
      await load();
    } catch {
      toast.error('Could not save the window.');
    } finally {
      setBusy(false);
    }
  };

  const createFee = async () => {
    if (!fLabel.trim() || !fValue) {
      toast.error('Enter a name and an amount.');
      return;
    }
    setBusy(true);
    try {
      await vendorLinkApi.createFee({
        label: fLabel.trim(),
        kind: fKind,
        value: Number(fValue),
        scope: {
          ...(fSource ? { sources: [fSource] } : {}),
          ...(fFulfillment ? { fulfillment: [fFulfillment] } : {}),
          ...(fLinkFilter ? { vendorLinks: [fLinkFilter] } : {}),
        },
      });
      toast.success('Fee added.');
      resetFeeForm();
      setFeeOpen(false);
      await load();
    } catch {
      toast.error('Could not save the fee.');
    } finally {
      setBusy(false);
    }
  };

  const toggleWindow = async (window: OrderingWindowDto) => {
    setBusy(true);
    try {
      await vendorLinkApi.updateWindow(window._id, { active: !window.active });
      toast.success(window.active ? 'Window paused.' : 'Window resumed.');
      await load();
    } catch {
      toast.error('Could not update the window.');
    } finally {
      setBusy(false);
    }
  };

  const toggleFee = async (fee: FeeRuleDto) => {
    setBusy(true);
    try {
      await vendorLinkApi.updateFee(fee._id, { active: !fee.active });
      toast.success(fee.active ? 'Fee paused.' : 'Fee resumed.');
      await load();
    } catch {
      toast.error('Could not update the fee.');
    } finally {
      setBusy(false);
    }
  };

  const deleteWindow = async (orderingWindow: OrderingWindowDto) => {
    if (!window.confirm(`Delete “${orderingWindow.name}”? Ordering goes back to normal for its hours.`)) {
      return;
    }
    setBusy(true);
    try {
      await vendorLinkApi.deleteWindow(orderingWindow._id);
      toast.success('Window deleted.');
      await load();
    } catch {
      toast.error('Could not delete the window.');
    } finally {
      setBusy(false);
    }
  };

  const deleteFee = async (fee: FeeRuleDto) => {
    if (!window.confirm(`Delete “${fee.label}”? Guests stop paying this fee immediately.`)) return;
    setBusy(true);
    try {
      await vendorLinkApi.deleteFee(fee._id);
      toast.success('Fee deleted.');
      await load();
    } catch {
      toast.error('Could not delete the fee.');
    } finally {
      setBusy(false);
    }
  };

  const shownWindows = useMemo(
    () =>
      windows.filter((w) =>
        linkFilter ? String(w.vendorLink ?? '') === linkFilter : !w.vendorLink,
      ),
    [windows, linkFilter],
  );

  const linkName = (id: string) => {
    const link = links.find((x) => x._id === id);
    return link?.outletName || link?.counterpartName || 'Outlet';
  };

  const feeScope = (fee: FeeRuleDto) =>
    [
      fee.scope?.sources?.length
        ? fee.scope.sources.map((x) => SOURCE_LABEL[x] ?? x).join(' or ')
        : 'All orders',
      fee.scope?.fulfillment?.length
        ? fee.scope.fulfillment.map((x) => DELIVERY_LABEL[x] ?? x).join(' or ')
        : 'Anywhere',
      fee.scope?.vendorLinks?.length
        ? fee.scope.vendorLinks.map(linkName).join(', ')
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

  const daysText = (days: string[]) =>
    days.length === 0 || days.length === DAYS.length
      ? 'Every day'
      : days.map((day) => DAY_LABEL[day] ?? day).join(', ');

  return (
    <div className={PAGE_SHELL}>
      <div className={PAGE_BODY}>
        <DashboardPageHeader
          title="Windows & fees"
          subtitle="Say when each outlet can take orders, and what extra charges apply."
          actions={
            <>
              <button type="button" onClick={() => setWindowOpen(true)} className={PILL_QUIET}>
                <Clock className="size-4" strokeWidth={1.75} />
                Add window
              </button>
              <button type="button" onClick={() => setFeeOpen(true)} className={PILL_PRIMARY}>
                <Percent className="size-4" strokeWidth={1.75} />
                Add fee
              </button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Windows"
            value={windows.length}
            icon={<Clock className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Active windows"
            value={activeWindowCount}
            tone="positive"
            icon={<Play className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Fees"
            value={fees.length}
            icon={<Percent className="size-[18px]" strokeWidth={1.75} />}
          />
        </div>

        {loading ? (
          <SurfaceCard className="px-5 py-5">
            <div className="h-4 w-1/4 animate-pulse rounded-full bg-res-surface" />
            <div className="mt-4 h-14 w-full animate-pulse rounded-res-md bg-res-surface" />
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard className="px-5 pt-5 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="type-res-h3 text-res-ink">Ordering windows</h2>
                  <p className="type-res-small mt-1 max-w-xl font-normal text-res-ink-muted">
                    An open window allows ordering in its hours; a block window closes it. When two
                    overlap, the one higher in the list wins.
                  </p>
                </div>
                <div className="w-full sm:w-52">
                  <Select
                    value={linkFilter || ANY}
                    onValueChange={(value) => setLinkFilter(fromAny(value))}
                  >
                    <SelectTrigger className={FIELD_CLASS} aria-label="Which orders these windows apply to">
                      <SelectValue placeholder="Hotel services" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value={ANY}>Hotel services</SelectItem>
                      {links.map((link) => (
                        <SelectItem key={link._id} value={link._id}>
                          {link.outletName || link.counterpartName || 'Outlet'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {shownWindows.length === 0 ? (
                  <div className="rounded-res-md bg-res-surface px-4 py-8 text-center">
                    <p className="type-res-body text-res-ink">No windows here yet</p>
                    <p className="type-res-small mx-auto mt-1 max-w-xs font-normal text-res-ink-muted">
                      Until you add one, orders follow the venue's normal opening hours.
                    </p>
                  </div>
                ) : (
                  shownWindows.map((orderingWindow) => {
                    const mode = MODE_STYLE[orderingWindow.mode] ?? MODE_STYLE.allow;
                    return (
                      <div
                        key={orderingWindow._id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-res-md bg-res-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="type-res-body font-semibold text-res-ink">
                              {orderingWindow.name}
                            </p>
                            <span
                              className={`type-res-caption rounded-full px-2.5 py-0.5 font-semibold ${mode.className}`}
                            >
                              {mode.label}
                            </span>
                            {!orderingWindow.active && (
                              <span className="type-res-caption rounded-full bg-res-card px-2.5 py-0.5 font-semibold text-res-ink-muted">
                                Paused
                              </span>
                            )}
                          </div>
                          <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                            {orderingWindow.start}–{orderingWindow.end} ·{' '}
                            {daysText(orderingWindow.days)} ·{' '}
                            {orderingWindow.vendorLink
                              ? linkName(String(orderingWindow.vendorLink))
                              : 'Hotel services'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void toggleWindow(orderingWindow)}
                            disabled={busy}
                            className={ROW_ACTION}
                          >
                            {orderingWindow.active ? (
                              <Pause className="size-3.5" strokeWidth={1.75} />
                            ) : (
                              <Play className="size-3.5" strokeWidth={1.75} />
                            )}
                            {orderingWindow.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteWindow(orderingWindow)}
                            disabled={busy}
                            aria-label={`Delete ${orderingWindow.name}`}
                            className={PILL_DANGER}
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard className="px-5 pt-5 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="type-res-h3 text-res-ink">Fees</h2>
                  <p className="type-res-small mt-1 max-w-xl font-normal text-res-ink-muted">
                    Flat or percentage charges added to an order, scoped to where it came from and
                    how it is delivered.
                  </p>
                </div>
                <button type="button" onClick={() => setFeeOpen(true)} className={PILL_QUIET}>
                  <Percent className="size-4" strokeWidth={1.75} />
                  Add fee
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {fees.length === 0 ? (
                  <div className="rounded-res-md bg-res-surface px-4 py-8 text-center">
                    <p className="type-res-body text-res-ink">No fees yet</p>
                    <p className="type-res-small mx-auto mt-1 max-w-xs font-normal text-res-ink-muted">
                      Guests only pay the order total until you add one.
                    </p>
                  </div>
                ) : (
                  fees.map((fee) => (
                    <div
                      key={fee._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-res-md bg-res-surface px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="type-res-body font-semibold text-res-ink">{fee.label}</p>
                          <span className="type-res-caption rounded-full bg-res-card px-2.5 py-0.5 font-semibold text-res-ink">
                            {fee.kind === 'flat' ? money(fee.value) : `${fee.value}%`}
                          </span>
                          {!fee.active && (
                            <span className="type-res-caption rounded-full bg-res-card px-2.5 py-0.5 font-semibold text-res-ink-muted">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                          {BENEFICIARY_LABEL[fee.beneficiary] ?? fee.beneficiary} keeps it ·{' '}
                          {feeScope(fee)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleFee(fee)}
                          disabled={busy}
                          className={ROW_ACTION}
                        >
                          {fee.active ? (
                            <Pause className="size-3.5" strokeWidth={1.75} />
                          ) : (
                            <Play className="size-3.5" strokeWidth={1.75} />
                          )}
                          {fee.active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteFee(fee)}
                          disabled={busy}
                          aria-label={`Delete ${fee.label}`}
                          className={PILL_DANGER}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SurfaceCard>
          </>
        )}
      </div>

      {/* Add window */}
      <Dialog open={windowOpen} onOpenChange={setWindowOpen}>
        <DialogContent className={MODAL_CONTENT_CLASS}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="type-res-h3 text-res-ink">Add ordering window</DialogTitle>
            <DialogDescription className="type-res-small font-normal text-res-ink-muted">
              Choose the hours, then whether they open or close ordering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <InsetBlock>
              <div className="space-y-3">
                <Field label="Window name" htmlFor="window-name">
                  <Input
                    id="window-name"
                    value={wName}
                    onChange={(event) => setWName(event.target.value)}
                    placeholder="e.g. Night room service"
                    className={FIELD_CLASS}
                  />
                </Field>

                <Field label="What it does" htmlFor="window-mode">
                  <Select value={wMode} onValueChange={(value) => setWMode(value as 'allow' | 'block')}>
                    <SelectTrigger id="window-mode" className={FIELD_CLASS}>
                      <SelectValue placeholder="Allow orders" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value="allow">Allows orders in these hours</SelectItem>
                      <SelectItem value="block">Blocks orders in these hours</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid w-full gap-3 sm:grid-cols-2">
                  <Field label="From" htmlFor="window-start">
                    <Input
                      id="window-start"
                      type="time"
                      value={wStart}
                      onChange={(event) => setWStart(event.target.value)}
                      className={FIELD_CLASS}
                    />
                  </Field>
                  <Field label="To" htmlFor="window-end">
                    <Input
                      id="window-end"
                      type="time"
                      value={wEnd}
                      onChange={(event) => setWEnd(event.target.value)}
                      className={FIELD_CLASS}
                    />
                  </Field>
                </div>

                <Field
                  label="Applies to"
                  htmlFor="window-scope"
                  hint="Leave as hotel services for orders guests place with the hotel itself."
                >
                  <Select
                    value={wLinkFilter || ANY}
                    onValueChange={(value) => setWLinkFilter(fromAny(value))}
                  >
                    <SelectTrigger id="window-scope" className={FIELD_CLASS}>
                      <SelectValue placeholder="Hotel services" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value={ANY}>Hotel services</SelectItem>
                      {links.map((link) => (
                        <SelectItem key={link._id} value={link._id}>
                          {link.outletName || link.counterpartName || 'Outlet'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </InsetBlock>

            <InsetBlock title="Days">
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => {
                  const on = wDays.has(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      aria-pressed={on}
                      className={`type-res-small cursor-pointer rounded-full px-4 py-2 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                        on
                          ? 'bg-res-brand text-res-ink-inverted'
                          : 'bg-res-card text-res-ink hover:text-res-brand'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {wDays.size === 0 && (
                <p className="type-res-caption mt-2 font-normal text-red-600">
                  Pick at least one day.
                </p>
              )}
            </InsetBlock>
          </div>

          <DialogFooter className="gap-2 border-t border-res-line pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setWindowOpen(false)}
              disabled={busy}
              className={PILL_QUIET}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createWindow()}
              disabled={busy || !wName.trim() || wDays.size === 0}
              className={PILL_PRIMARY}
            >
              {busy ? 'Saving…' : 'Add window'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add fee */}
      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent className={MODAL_CONTENT_CLASS}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="type-res-h3 text-res-ink">Add fee</DialogTitle>
            <DialogDescription className="type-res-small font-normal text-res-ink-muted">
              An extra charge on an order, and who it goes to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <InsetBlock>
              <div className="space-y-3">
                <Field label="Fee name" htmlFor="fee-label">
                  <Input
                    id="fee-label"
                    value={fLabel}
                    onChange={(event) => setFLabel(event.target.value)}
                    placeholder="e.g. Tray charge"
                    className={FIELD_CLASS}
                  />
                </Field>

                <div className="grid w-full gap-3 sm:grid-cols-2">
                  <Field label="Charge type" htmlFor="fee-kind">
                    <Select value={fKind} onValueChange={(value) => setFKind(value as 'flat' | 'percent')}>
                      <SelectTrigger id="fee-kind" className={FIELD_CLASS}>
                        <SelectValue placeholder="Flat amount" />
                      </SelectTrigger>
                      <SelectContent className="rounded-res-md">
                        <SelectItem value="flat">A flat amount</SelectItem>
                        <SelectItem value="percent">A percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={fKind === 'flat' ? 'Amount (₦)' : 'Percentage (%)'} htmlFor="fee-value">
                    <Input
                      id="fee-value"
                      value={fValue}
                      onChange={(event) => setFValue(event.target.value)}
                      type="number"
                      min={0}
                      placeholder={fKind === 'flat' ? '500' : '15'}
                      className={FIELD_CLASS}
                    />
                  </Field>
                </div>
              </div>
            </InsetBlock>

            <InsetBlock title="When it applies">
              <div className="space-y-3">
                <Field label="Order comes from" htmlFor="fee-source">
                  <Select
                    value={fSource || ANY}
                    onValueChange={(value) => setFSource(fromAny(value) as 'hotel' | 'linked' | '')}
                  >
                    <SelectTrigger id="fee-source" className={FIELD_CLASS}>
                      <SelectValue placeholder="All orders" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value={ANY}>All orders</SelectItem>
                      <SelectItem value="hotel">Hotel services</SelectItem>
                      <SelectItem value="linked">Linked outlets</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Delivered to" htmlFor="fee-delivery">
                  <Select
                    value={fFulfillment || ANY}
                    onValueChange={(value) =>
                      setFFulfillment(fromAny(value) as 'room' | 'location' | '')
                    }
                  >
                    <SelectTrigger id="fee-delivery" className={FIELD_CLASS}>
                      <SelectValue placeholder="Anywhere" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value={ANY}>Anywhere</SelectItem>
                      <SelectItem value="room">To a room</SelectItem>
                      <SelectItem value="location">To a location</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="For which outlet" htmlFor="fee-scope">
                  <Select
                    value={fLinkFilter || ANY}
                    onValueChange={(value) => setFLinkFilter(fromAny(value))}
                  >
                    <SelectTrigger id="fee-scope" className={FIELD_CLASS}>
                      <SelectValue placeholder="All outlets" />
                    </SelectTrigger>
                    <SelectContent className="rounded-res-md">
                      <SelectItem value={ANY}>All outlets</SelectItem>
                      {links.map((link) => (
                        <SelectItem key={link._id} value={link._id}>
                          {link.outletName || link.counterpartName || 'Outlet'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </InsetBlock>
          </div>

          <DialogFooter className="gap-2 border-t border-res-line pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setFeeOpen(false)}
              disabled={busy}
              className={PILL_QUIET}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createFee()}
              disabled={busy || !fLabel.trim() || !fValue}
              className={PILL_PRIMARY}
            >
              {busy ? 'Saving…' : 'Add fee'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
