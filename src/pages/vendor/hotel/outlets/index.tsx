import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  EmptyState,
  FIELD_CLASS,
  MODAL_CONTENT_CLASS,
  PAGE_BODY,
  PAGE_SHELL,
  PILL_DANGER,
  PILL_PRIMARY,
  PILL_QUIET,
  StatTile,
  TEXT_ACTION,
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
  vendorLinkApi,
  type PublicVendorSummary,
  type VendorLinkDto,
} from '@/services/vendorlink.service';

/* ────────────────────────────── vocabulary ──────────────────────────────── */

/** Operational words only — no codes, no system names (presentation standard). */
const SCOPE_LABEL: Record<string, string> = {
  'read:menu': 'Menu access',
  'write:orders': 'Room ordering',
  'read:delivery_locations': 'Delivery routing',
};

const ALL_SCOPES = ['read:menu', 'write:orders', 'read:delivery_locations'] as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-res-secondary text-res-brand' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  suspended: { label: 'Suspended', className: 'bg-res-surface text-res-ink-muted' },
  revoked: { label: 'Revoked', className: 'bg-red-50 text-red-700' },
};

type OutletTab = 'active' | 'inactive' | 'all';
type EditField = 'commission' | 'prepTime';
type EditState = { id: string; field: EditField } | null;

/* ────────────────────────────── helpers ─────────────────────────────────── */

const commissionText = (commission?: VendorLinkDto['commission']) => {
  if (!commission || commission.value == null) return 'Not set';
  return commission.kind === 'flat'
    ? `₦${commission.value} per order`
    : `${commission.value}% of the order`;
};

const prepTimeText = (minutes?: number | null) =>
  minutes != null && minutes > 0 ? `${minutes} min` : 'Not set';

/* ────────────────────────────── page ────────────────────────────────────── */

export default function HotelOutletsPage() {
  const [links, setLinks] = useState<VendorLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<OutletTab>('active');

  const [editing, setEditing] = useState<EditState>(null);
  const [draft, setDraft] = useState('');

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicVendorSummary[]>([]);
  const [selected, setSelected] = useState<PublicVendorSummary | null>(null);
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const searchAbort = useRef<AbortController | null>(null);

  const counts = useMemo(
    () => ({
      active: links.filter((l) => l.status === 'active').length,
      pending: links.filter((l) => l.status === 'pending').length,
      suspended: links.filter((l) => l.status === 'suspended').length,
      inactive: links.filter((l) => l.status === 'suspended' || l.status === 'revoked').length,
    }),
    [links],
  );

  const visibleLinks = useMemo(() => {
    if (tab === 'active') return links.filter((l) => l.status === 'active');
    if (tab === 'inactive') return links.filter((l) => l.status === 'suspended' || l.status === 'revoked');
    return links;
  }, [links, tab]);

  const load = useCallback(async () => {
    try {
      setLinks(await vendorLinkApi.hotelLinks());
    } catch {
      toast.error('Could not load your linked outlets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── search: debounced, cancellable, and never overwritten by a stale reply ── */

  useEffect(() => {
    const term = query.trim();
    // A picked restaurant fills the box with its own name — don't re-search it.
    const alreadyPicked = selected != null && term === selected.businessName.trim();

    if (term.length === 0 || alreadyPicked) {
      searchAbort.current?.abort();
      setResults([]);
      setSearchState('idle');
      return;
    }

    const timer = setTimeout(() => {
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearchState('searching');

      vendorLinkApi
        .searchVendors(term, 'restaurant', { signal: controller.signal })
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setSearchState('done');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if ((error as { code?: string }).code === 'ERR_CANCELED') return;
          setResults([]);
          setSearchState('error');
        });
    }, 280);

    // Cancel on every change, so a reply for an older term can never land.
    return () => {
      clearTimeout(timer);
      searchAbort.current?.abort();
    };
  }, [query, retryCount, selected]);

  useEffect(() => () => searchAbort.current?.abort(), []);

  const resetInvite = () => {
    searchAbort.current?.abort();
    setInviteEmail('');
    setQuery('');
    setResults([]);
    setSelected(null);
    setSearchState('idle');
  };

  const changeInviteOpen = (open: boolean) => {
    setInviteOpen(open);
    if (!open) resetInvite();
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    if (selected) {
      if (inviteEmail.trim() === (selected.email ?? '').trim()) setInviteEmail('');
      setSelected(null);
    }
  };

  const pickRestaurant = (vendor: PublicVendorSummary) => {
    setSelected(vendor);
    setQuery(vendor.businessName.trim());
    setResults([]);
    setSearchState('idle');
    if (vendor.email) setInviteEmail(vendor.email);
  };

  const clearRestaurant = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setSearchState('idle');
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || busy) return;
    setBusy(true);
    try {
      await vendorLinkApi.invite({
        email,
        partnerVendorId: selected?._id,
        outletName: selected?.businessName.trim(),
      });
      setInviteOpen(false);
      resetInvite();
      toast.success('Invite sent.');
      await load();
    } catch {
      toast.error('Could not send the invite. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  /* ── inline detail editing ── */

  const startEdit = (link: VendorLinkDto, field: EditField) => {
    setEditing({ id: link._id, field });
    setDraft(
      field === 'commission'
        ? String(link.commission?.value ?? '')
        : String(link.defaultPrepEtaMins ?? '')
    );
  };

  const saveEdit = async (link: VendorLinkDto) => {
    if (!editing) return;
    const value = Number(draft);
    const isCommission = editing.field === 'commission';

    if (!Number.isFinite(value) || value < 0 || (!isCommission && value < 1)) {
      toast.error(isCommission ? 'Enter a commission of 0 or more.' : 'Enter a prep time of 1 minute or more.');
      return;
    }

    setBusy(true);
    try {
      await vendorLinkApi.updateLink(
        link._id,
        isCommission ? { commission: { value } } : { defaultPrepEtaMins: Math.round(value) }
      );
      toast.success(isCommission ? 'Commission saved.' : 'Prep time saved.');
      setEditing(null);
      setDraft('');
      await load();
    } catch {
      toast.error(isCommission ? 'Could not save the commission.' : 'Could not save the prep time.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (link: VendorLinkDto, status: 'active' | 'suspended') => {
    if (busy) return;
    setBusy(true);
    try {
      await vendorLinkApi.updateLink(link._id, { status });
      toast.success(status === 'active' ? 'Outlet resumed.' : 'Outlet suspended.');
      await load();
    } catch {
      toast.error('Could not update the outlet.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (link: VendorLinkDto) => {
    const name = link.outletName || link.counterpartName || 'this outlet';
    if (!window.confirm(`Revoke ${name}? Orders from this outlet stop immediately.`)) return;
    setBusy(true);
    try {
      await vendorLinkApi.revokeLink(link._id);
      toast.success('Outlet revoked.');
      await load();
    } catch {
      toast.error('Could not revoke the outlet.');
    } finally {
      setBusy(false);
    }
  };

  /* ── view ── */

  const tabs: Array<{ key: OutletTab; label: string; count: number }> = [
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'inactive', label: 'Inactive', count: counts.inactive },
    { key: 'all', label: 'All', count: links.length },
  ];

  return (
    <div className={PAGE_SHELL}>
      <div className={PAGE_BODY}>
        <DashboardPageHeader
          title="Linked outlets"
          subtitle="Restaurants, bars and lounges that can send food and drink to your rooms."
          actions={
            <button type="button" onClick={() => setInviteOpen(true)} className={PILL_PRIMARY}>
              <Mail className="size-4" strokeWidth={1.75} />
              Invite by email
            </button>
          }
        />

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Linked outlets"
            value={links.length}
            icon={<UtensilsCrossed className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Active"
            value={counts.active}
            tone="positive"
            icon={<CheckCircle2 className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Pending"
            value={counts.pending}
            tone="attention"
            icon={<Clock className="size-[18px]" strokeWidth={1.75} />}
          />
          <StatTile
            label="Suspended"
            value={counts.suspended}
            tone="neutral"
            icon={<Shield className="size-[18px]" strokeWidth={1.75} />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-res-card p-1 shadow-res-low">
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-pressed={active}
                  className={`type-res-small cursor-pointer rounded-full px-4 py-2 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                    active
                      ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                      : 'text-res-ink-muted hover:text-res-ink'
                  }`}
                >
                  {item.label}
                  <span className={`ml-1.5 ${active ? 'text-res-ink-inverted/70' : 'text-res-ink-muted'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="type-res-small font-normal text-res-ink-muted">
            {visibleLinks.length} {visibleLinks.length === 1 ? 'outlet' : 'outlets'} shown
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {[0, 1].map((key) => (
              <div key={key} className="rounded-res-lg bg-res-card p-5 shadow-res-low">
                <div className="flex items-center gap-3">
                  <div className="size-10 animate-pulse rounded-full bg-res-surface" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-res-surface" />
                    <div className="h-3 w-1/3 animate-pulse rounded-full bg-res-surface" />
                  </div>
                </div>
                <div className="mt-4 h-16 animate-pulse rounded-res-md bg-res-surface" />
              </div>
            ))}
          </div>
        ) : visibleLinks.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="size-6" strokeWidth={1.75} />}
            title={emptyTitle(tab)}
            description={emptySubtitle(tab)}
            action={
              tab === 'all' ? (
                <button type="button" onClick={() => setInviteOpen(true)} className={PILL_PRIMARY}>
                  <Mail className="size-4" strokeWidth={1.75} />
                  Invite by email
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleLinks.map((link) => (
              <OutletCard
                key={link._id}
                link={link}
                editing={editing?.id === link._id ? editing.field : null}
                draft={draft}
                busy={busy}
                onDraftChange={setDraft}
                onStartEdit={(field) => startEdit(link, field)}
                onCancelEdit={() => {
                  setEditing(null);
                  setDraft('');
                }}
                onSave={() => void saveEdit(link)}
                onStatus={(status) => void setStatus(link, status)}
                onRevoke={() => void revoke(link)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Invite ─────────────────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={changeInviteOpen}>
        <DialogContent className={MODAL_CONTENT_CLASS}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="type-res-h3 text-res-ink">Invite a restaurant</DialogTitle>
            <DialogDescription className="type-res-small font-normal text-res-ink-muted">
              We email them a pairing code. Once they accept it, their outlet appears here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="outlet-search"
                className="type-res-caption block uppercase tracking-wider text-res-ink-muted"
              >
                Find the restaurant
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-res-ink-muted" />
                <Input
                  id="outlet-search"
                  type="search"
                  value={query}
                  onChange={(event) => changeQuery(event.target.value)}
                  placeholder="Name, email or area — part of a word is enough"
                  autoComplete="off"
                  className={`${FIELD_CLASS} pr-10 pl-10`}
                />
                {searchState === 'searching' && (
                  <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-res-brand" />
                )}
              </div>
            </div>

            {query.trim().length > 0 && !selected && (
              <div className="max-h-56 overflow-y-auto rounded-res-md bg-res-surface">
                {searchState === 'error' ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <AlertCircle className="size-5 text-red-500" strokeWidth={1.75} />
                    <p className="type-res-body text-res-ink">Could not search right now.</p>
                    <p className="type-res-small font-normal text-res-ink-muted">
                      Check your connection, then try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRetryCount((count) => count + 1)}
                      className={`${PILL_QUIET} mt-1`}
                    >
                      Try again
                    </button>
                  </div>
                ) : searchState === 'done' && results.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="type-res-body text-res-ink">
                      No restaurant matches “{query.trim()}”.
                    </p>
                    <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                      Check the spelling, or send the code to their email below.
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="space-y-2 px-4 py-6">
                    <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-res-card" />
                    <div className="mx-auto h-3 w-1/2 animate-pulse rounded-full bg-res-card" />
                  </div>
                ) : (
                  <ul className="divide-y divide-res-line">
                    {results.map((vendor) => (
                      <li key={vendor._id}>
                        <button
                          type="button"
                          onClick={() => pickRestaurant(vendor)}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-res-card focus-visible:bg-res-card"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-res-card text-res-brand">
                            <UtensilsCrossed className="size-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="type-res-body block truncate font-semibold text-res-ink">
                              {vendor.businessName.trim()}
                            </span>
                            <span className="type-res-small block truncate font-normal text-res-ink-muted">
                              {vendor.email || vendor.address || 'No email on file'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selected && (
              <div className="flex items-center gap-3 rounded-res-md bg-res-surface px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-res-card text-res-brand">
                  <UtensilsCrossed className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="type-res-body truncate font-semibold text-res-ink">
                    {selected.businessName.trim()}
                  </p>
                  <p className="type-res-small truncate font-normal text-res-ink-muted">
                    {selected.email || 'No email on file — add one below'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRestaurant}
                  aria-label="Clear the selected restaurant"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full text-res-ink-muted transition-colors outline-none hover:bg-res-card hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="invite-email"
                className="type-res-caption block uppercase tracking-wider text-res-ink-muted"
              >
                Send the code to
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="restaurant@example.com"
                className={FIELD_CLASS}
              />
              <p className="type-res-small font-normal text-res-ink-muted">
                {selected
                  ? 'Filled in from the restaurant you picked. Change it if someone else should get the code.'
                  : 'You can invite a restaurant without picking one from the list.'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-res-line pt-4 sm:flex-row">
            <button
              type="button"
              onClick={() => changeInviteOpen(false)}
              disabled={busy}
              className={PILL_QUIET}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void sendInvite()}
              disabled={busy || !inviteEmail.trim()}
              className={PILL_PRIMARY}
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────── pieces ──────────────────────────────────── */

function OutletCard({
  link,
  editing,
  draft,
  busy,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onStatus,
  onRevoke,
}: {
  link: VendorLinkDto;
  editing: EditField | null;
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onStartEdit: (field: EditField) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onStatus: (status: 'active' | 'suspended') => void;
  onRevoke: () => void;
}) {
  const status = STATUS_STYLE[link.status] ?? STATUS_STYLE.pending;
  const name = link.outletName || link.counterpartName || 'Unnamed outlet';
  const subline = [link.counterpartName, link.invitedEmail && `invited ${link.invitedEmail}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex flex-col rounded-res-lg bg-res-card px-5 pt-5 pb-4 shadow-res-low transition-shadow hover:shadow-res-medium">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-res-surface text-res-brand">
          <UtensilsCrossed className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-res-h3 truncate text-res-ink">{name}</h3>
          {subline && (
            <p className="type-res-small mt-0.5 truncate font-normal text-res-ink-muted">{subline}</p>
          )}
        </div>
        <span
          className={`type-res-small shrink-0 rounded-full px-3 py-1 font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ALL_SCOPES.map((scope) => {
          const enabled = (link.scopes ?? []).includes(scope);
          return (
            <span
              key={scope}
              className={`type-res-small rounded-full px-2.5 py-1 font-medium ${
                enabled
                  ? 'bg-res-secondary text-res-brand'
                  : 'bg-res-surface text-res-ink-muted'
              }`}
            >
              {SCOPE_LABEL[scope] ?? scope}
            </span>
          );
        })}
      </div>

      <div className="mt-4 divide-y divide-res-line rounded-res-md bg-res-surface px-4">
        <DetailRow
          label="Your commission"
          value={commissionText(link.commission)}
          suffix={link.commission?.kind === 'flat' ? '₦ per order' : '%'}
          isEditing={editing === 'commission'}
          draft={draft}
          busy={busy}
          numeric={{ min: 0, step: 'any' }}
          onDraftChange={onDraftChange}
          onStartEdit={() => onStartEdit('commission')}
          onCancelEdit={onCancelEdit}
          onSave={onSave}
        />
        <DetailRow
          label="Prep time"
          value={prepTimeText(link.defaultPrepEtaMins)}
          suffix="min"
          isEditing={editing === 'prepTime'}
          draft={draft}
          busy={busy}
          numeric={{ min: 1, step: '1' }}
          onDraftChange={onDraftChange}
          onStartEdit={() => onStartEdit('prepTime')}
          onCancelEdit={onCancelEdit}
          onSave={onSave}
        />
      </div>

      <div className="mt-4 flex flex-1 items-end justify-between gap-2">
        {link.status === 'active' ? (
          <button type="button" onClick={() => onStatus('suspended')} disabled={busy} className={PILL_QUIET}>
            Suspend
          </button>
        ) : link.status === 'suspended' ? (
          <button type="button" onClick={() => onStatus('active')} disabled={busy} className={PILL_QUIET}>
            Resume
          </button>
        ) : (
          <span className="type-res-small font-normal text-res-ink-muted">
            {link.status === 'pending'
              ? 'Waiting for the restaurant to accept.'
              : 'This link was revoked.'}
          </span>
        )}
        <button type="button" onClick={onRevoke} disabled={busy} className={PILL_DANGER}>
          <Trash2 className="size-4" strokeWidth={1.75} />
          Revoke
        </button>
      </div>
    </article>
  );
}

function DetailRow({
  label,
  value,
  suffix,
  isEditing,
  draft,
  busy,
  numeric,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  label: string;
  value: string;
  suffix: string;
  isEditing: boolean;
  draft: string;
  busy: boolean;
  numeric: { min: number; step: string };
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="type-res-small font-normal text-res-ink-muted">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            type="number"
            min={numeric.min}
            step={numeric.step}
            autoFocus
            className="h-9 w-20 rounded-res-sm border-0 bg-res-card px-2.5 text-right type-res-body font-semibold text-res-ink"
          />
          <span className="type-res-caption text-res-ink-muted">{suffix}</span>            <button type="button" onClick={onSave} disabled={busy} className={TEXT_ACTION}>
            Save
          </button>
          <button type="button" onClick={onCancelEdit} disabled={busy} className={TEXT_ACTION}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="type-res-body font-semibold text-res-ink">{value}</span>
          <button type="button" onClick={onStartEdit} className={TEXT_ACTION}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

function emptyTitle(tab: OutletTab) {
  if (tab === 'active') return 'No active outlets yet';
  if (tab === 'inactive') return 'No suspended outlets';
  return 'No outlets linked yet';
}

function emptySubtitle(tab: OutletTab) {
  if (tab === 'active') return 'Invite a restaurant, or resume one that is suspended.';
  if (tab === 'inactive') return 'Everything you have linked is active and taking orders.';
  return 'Invite a restaurant by email and their outlet will appear here once they accept.';
}
