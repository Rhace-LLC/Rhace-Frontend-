import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import Header from '@/components/user/Header';
import Footer from '@/navigation/user_layout/_sub_component/Footer';
import { Modal } from '@/components/others/RhaceModal';
import { DateTimeFields, type DateSelection, type DateTimeValue } from '@/components/user/reservation/DateTimeFields';
import { TimeSlotPicker } from '@/components/user/reservation/TimeSlotPicker';
import { BlueprintAvailabilityView } from '@/components/user/inventory/BlueprintAvailabilityView';
import {
  getBlueprintPricing,
  isBlueprintSelectableForParty,
  toDomainBlueprint,
  useBookingQuote,
  useConfirmHold,
  useHoldUnit,
  useVendorBlueprints,
  useVendorFloorPlans,
} from '@/features/floor-plan';
import { unitReservationService } from '@/services/unitReservation.service';
import { paymentService } from '@/services/payment.service';
import { useAuth } from '@/contexts/AuthContext';
import type { Vertical } from '@/features/floor-plan/domain/types';
import type { PaymentStrategyDto } from '@/types';

const SEGMENT: Record<Vertical, string> = {
  restaurant: 'restaurants',
  club: 'clubs',
  hotel: 'hotels',
};

const STRATEGY_LABEL: Record<PaymentStrategyDto, string> = {
  full_prepayment: 'Pay in full',
  deposit_50_percent: 'Pay a deposit',
  pay_at_venue: 'Pay at venue',
};

const STRATEGY_HINT: Record<PaymentStrategyDto, string> = {
  full_prepayment: 'Pay the full amount now to secure your booking.',
  deposit_50_percent: 'Pay a deposit now and the balance later.',
  pay_at_venue: 'No online payment. Settle directly at the venue.',
};

const DEFAULT_STRATEGY: PaymentStrategyDto = 'deposit_50_percent';

const CONFIRM_PATH: Record<Vertical, (reservationId: string) => string> = {
  restaurant: (rid) => `/restaurants/confirmation/${rid}`,
  club: (rid) => `/clubs/confirmation/${rid}`,
  hotel: (rid) => `/hotels/confirmation/${rid}`,
};

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';

function verticalFromPath(pathname: string): Vertical {
  if (pathname.startsWith('/hotels')) return 'hotel';
  if (pathname.startsWith('/clubs')) return 'club';
  return 'restaurant';
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const ReserveBlueprintPage = () => {
  const { id, blueprintId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const vertical = verticalFromPath(location.pathname);

  const blueprintsQuery = useVendorBlueprints(id, vertical);
  const blueprints = useMemo(
    () => (blueprintsQuery.data?.items ?? []).map(toDomainBlueprint),
    [blueprintsQuery.data]
  );
  const blueprint = blueprints.find((entry) => entry.id === blueprintId);
  const pricing = blueprint ? getBlueprintPricing(blueprint) : null;

  const plansQuery = useVendorFloorPlans(id, vertical);
  const planId = plansQuery.data?.items?.[0]?._id;

  const [dateValue, setDateValue] = useState<DateTimeValue>({ partySize: 2, dateReady: false });
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);
  const [stage, setStage] = useState<'select' | 'confirm'>('select');
  const [lockToken, setLockToken] = useState<string | null>(null);
  const [unitLabel, setUnitLabel] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [guest, setGuest] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: '',
  });

  const holdMutation = useHoldUnit();
  const confirmMutation = useConfirmHold();

  // Final selection: hotel = dates from Step 1; restaurant/club = the chosen slot.
  const selection = useMemo<DateSelection>(() => {
    if (vertical === 'hotel') {
      return {
        start: dateValue.start,
        end: dateValue.end,
        partySize: dateValue.partySize,
        ready: dateValue.dateReady,
      };
    }
    return {
      start: slot?.start,
      end: slot?.end,
      partySize: dateValue.partySize,
      ready: Boolean(slot),
    };
  }, [vertical, dateValue, slot]);

  // Changing the date clears the chosen slot.
  useEffect(() => {
    setSlot(null);
  }, [dateValue.date]);

  const partySelectable =
    vertical === 'hotel' || !blueprint
      ? true
      : isBlueprintSelectableForParty(blueprint, dateValue.partySize);

  const [strategy, setStrategy] = useState<PaymentStrategyDto>(DEFAULT_STRATEGY);
  const [submitting, setSubmitting] = useState(false);

  const quoteInput = useMemo(() => {
    if (!blueprint || !selection.ready || !selection.start || !selection.end) return undefined;
    return {
      blueprintId: blueprint.id,
      start: selection.start,
      end: selection.end,
      partySize: selection.partySize,
    };
  }, [blueprint, selection.ready, selection.start, selection.end, selection.partySize]);

  const quoteQuery = useBookingQuote(stage === 'confirm' ? quoteInput : undefined);
  const quote = quoteQuery.data;

  useEffect(() => {
    if (!quote) return;
    setStrategy((prev) => {
      const allowed = quote.strategies.map((entry) => entry.strategy);
      if (prev && allowed.includes(prev)) return prev;
      const preferred = (
        ['deposit_50_percent', 'full_prepayment', 'pay_at_venue'] as PaymentStrategyDto[]
      ).find((entry) => allowed.includes(entry));
      return preferred ?? 'pay_at_venue';
    });
  }, [quote]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setGuest((prev) => ({
      ...prev,
      guestName:
        prev.guestName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
      guestEmail: prev.guestEmail || user?.email || '',
    }));
  }, [user?.firstName, user?.lastName, user?.email]);

  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0;

  useEffect(() => {
    if (stage === 'confirm' && expiresAt && remainingMs <= 0) {
      setStage('select');
      setLockToken(null);
      setUnitLabel(null);
      setExpiresAt(null);
      toast.info('Your hold expired. Please choose a time again.');
    }
  }, [stage, expiresAt, remainingMs]);

  useEffect(() => {
    if (stage !== 'confirm' || !lockToken || !id) return;
    const timer = setInterval(() => {
      unitReservationService
        .heartbeatLock(lockToken, id)
        .then((res) => {
          const exp = res.data?.expiresAt;
          if (exp) setExpiresAt(new Date(exp).getTime());
        })
        .catch(() => undefined);
    }, 120_000);
    return () => clearInterval(timer);
  }, [stage, lockToken, id]);

  const handleContinue = () => {
    if (!blueprint || !selection.ready || !id) return;
    if (!user) {
      navigate(
        `/auth/user/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
      );
      return;
    }
    holdMutation.mutate(
      {
        input: {
          vendorId: id,
          blueprintId: blueprint.id,
          floorPlanId: planId,
          start: selection.start,
          end: selection.end,
          partySize: selection.partySize,
        },
        idempotencyKey: crypto.randomUUID(),
      },
      {
        onSuccess: (res) => {
          const data = res.data;
          if (!data) return;
          setLockToken(data.lock.token);
          setExpiresAt(new Date(data.lock.expiresAt).getTime());
          setUnitLabel(data.unit.label);
          setStage('confirm');
        },
        onError: (error) =>
          toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Could not hold this unit. Please pick another time.'
          ),
      }
    );
  };

  const handleConfirm = async () => {
    if (!lockToken || !id || !guest.guestName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await confirmMutation.mutateAsync({
        vendorId: id,
        lockToken,
        guestName: guest.guestName.trim(),
        guestEmail: guest.guestEmail.trim() || undefined,
        guestPhone: guest.guestPhone.trim() || undefined,
        specialRequests: guest.specialRequests.trim() || undefined,
        partySize: selection.partySize,
        strategy,
        idempotencyKey: crypto.randomUUID(),
      });

      const data = res.data;
      if (!data) throw new Error('No confirmation returned');

      const reservationId = data.reservation?._id;
      const groupId = data.group?._id;

      if (data.payment?.required && groupId) {
        const intent = await paymentService.createGroupIntent(groupId, strategy);
        const url = intent?.data?.authorization_url as string | undefined;
        if (!url) throw new Error('Could not start payment. Please try again.');
        window.location.href = url;
        return;
      }

      if (reservationId) {
        navigate(CONFIRM_PATH[vertical](reservationId), {
          state: { reservation: data.reservation },
        });
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error as Error)?.message ||
        'Could not confirm the reservation.';
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleCloseConfirm = () => {
    if (lockToken && id) unitReservationService.releaseLock(lockToken, id).catch(() => undefined);
    setStage('select');
    setLockToken(null);
    setUnitLabel(null);
    setExpiresAt(null);
  };

  const selectedStrategy = quote?.strategies.find((entry) => entry.strategy === strategy);
  const requiresPayment = Boolean(selectedStrategy?.required);

  return (
    <div className="min-h-screen bg-res-surface">
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-4 pb-24 md:mt-[85px] md:space-y-6 md:px-6 md:py-8 lg:px-8">
        <nav className="type-res-small flex items-center gap-1.5 font-normal text-res-ink-muted">
          <Link to={`/${SEGMENT[vertical]}/${id}`} className="font-medium hover:text-res-brand">
            Back to venue
          </Link>
          <span>/</span>
          <span className="font-semibold text-res-ink">{blueprint?.name ?? 'Reservation'}</span>
        </nav>

        <div className="space-y-5">
          <div>
            {blueprint ? (
              <section className="overflow-hidden rounded-res-lg bg-res-card shadow-res-low">
                <div className="p-2 pb-0">
                  {blueprint.images[0] ? (
                    <img
                      src={blueprint.images[0]}
                      alt={blueprint.name}
                      className="h-64 w-full rounded-res-md object-cover"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center rounded-res-md bg-res-surface">
                      <span className="type-res-h2 text-res-ink-muted">{blueprint.type}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-5 p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        {blueprint.type}
                      </p>
                      <h1 className="type-res-h2 mt-1 text-res-ink">{blueprint.name}</h1>
                    </div>
                    <div className="rounded-res-md bg-res-surface px-4 py-3 text-right">
                      {pricing?.mode === 'room' ? (
                        <>
                          <p className="type-res-h2 text-res-ink">
                            ₦{pricing.price.toLocaleString()}
                          </p>
                          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                            per night
                          </p>
                        </>
                      ) : pricing?.mode === 'table' ? (
                        pricing.isFree ? (
                          <p className="type-res-h3 text-res-brand">Free reservation</p>
                        ) : (
                          <>
                            <p className="type-res-h2 text-res-ink">
                              ₦{pricing.minimumDeposit.toLocaleString()}
                            </p>
                            <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                              deposit · credited to bill
                            </p>
                          </>
                        )
                      ) : null}
                    </div>
                  </div>

                  {blueprint.description && (
                    <p className="type-res-body font-normal text-res-ink-muted">
                      {blueprint.description}
                    </p>
                  )}

                  <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="rounded-res-sm bg-res-surface p-3">
                      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Capacity
                      </dt>
                      <dd className="type-res-body mt-1 font-semibold text-res-ink">
                        {blueprint.capacity}
                        {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                          ? `–${blueprint.maxCapacity}`
                          : ''}{' '}
                        guests
                      </dd>
                    </div>
                    <div className="rounded-res-sm bg-res-surface p-3">
                      <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Currency
                      </dt>
                      <dd className="type-res-body mt-1 font-semibold text-res-ink">NGN (₦)</dd>
                    </div>
                  </dl>

                  {blueprint.amenities.length > 0 && (
                    <div>
                      <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Amenities
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {blueprint.amenities.map((amenity) => (
                          <span
                            key={amenity.id}
                            className="type-res-small rounded-full bg-res-surface px-3 py-1 font-medium text-res-ink-muted"
                          >
                            {amenity.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {blueprint.bookingPolicies.length > 0 && (
                    <div className="rounded-res-md bg-res-surface p-4">
                      <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Booking policies
                      </p>
                      <ul className="type-res-small space-y-1.5 font-normal text-res-ink">
                        {blueprint.bookingPolicies.map((policy) => (
                          <li key={policy.id} className="flex gap-2">
                            <span className="mt-1.5 inline-block size-1 shrink-0 rounded-full bg-res-brand" />
                            {policy.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {blueprint.images.length > 1 && (
                    <div>
                      <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                        Gallery
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {blueprint.images.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            loading="lazy"
                            className="h-16 w-16 rounded-res-sm object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : blueprintsQuery.isLoading ? (
              <div className="h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />
            ) : (
              <div className="rounded-res-lg bg-res-card px-6 py-16 text-center shadow-res-low">
                <p className="type-res-h3 text-res-ink">No longer available</p>
                <p className="type-res-small mt-1 text-res-ink-muted">
                  This reservation option is no longer available.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
              <h2 className="type-res-h3 text-res-ink">
                {vertical === 'hotel' ? 'Select dates' : 'Select a date'}
              </h2>
              <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                {vertical === 'hotel'
                  ? 'Choose check-in, check-out and guests.'
                  : 'Choose a date and party size, then pick a time.'}
              </p>
              <div className="mt-4 rounded-res-md bg-res-surface p-3 sm:p-4">
                <DateTimeFields vertical={vertical} onChange={setDateValue} />
              </div>
            </div>

            {vertical !== 'hotel' && (
              <TimeSlotPicker
                planId={planId}
                blueprintId={blueprintId ?? ''}
                date={dateValue.date}
                partySize={dateValue.partySize}
                maxCapacity={blueprint?.maxCapacity}
                selectedStart={slot?.start}
                onSelect={setSlot}
              />
            )}

            <div className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
              <BlueprintAvailabilityView
                planId={planId}
                blueprintId={blueprintId!}
                start={selection.start}
                end={selection.end}
              />
            </div>

            <div className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-6">
              <button
                type="button"
                disabled={!selection.ready || !partySelectable || holdMutation.isPending}
                onClick={handleContinue}
                className="type-res-body w-full cursor-pointer rounded-full bg-res-brand px-4 py-3.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {holdMutation.isPending ? 'Holding…' : 'Continue to confirm'}
              </button>
              {!partySelectable && (
                <p className="type-res-small mt-2 text-center font-medium text-res-ink-muted">
                  This option seats up to {blueprint?.maxCapacity ?? '—'} guests.
                </p>
              )}
              {!user && (
                <p className="type-res-small mt-2 text-center font-normal text-res-ink-muted">
                  You&apos;ll be asked to sign in before confirming.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>

      <Modal
        isOpen={stage === 'confirm'}
        onClose={handleCloseConfirm}
        title="Confirm your reservation"
        subtitle={unitLabel ? `${vertical === 'hotel' ? 'Room' : 'Table'} ${unitLabel} held for you` : 'Complete your details'}
        footer={
          <>
            <button
              onClick={handleCloseConfirm}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!guest.guestName.trim() || submitting || confirmMutation.isPending}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Processing…'
                : requiresPayment
                  ? `Pay ₦${(selectedStrategy?.amount ?? 0).toLocaleString()}`
                  : 'Confirm reservation'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-res-md bg-res-secondary px-4 py-2.5">
            <span className="type-res-small font-medium text-res-ink-muted">Hold expires in</span>
            <span className="font-mono text-base font-semibold text-res-brand">
              {formatCountdown(remainingMs)}
            </span>
          </div>

          <label className="block">
            <span className="type-res-small mb-1.5 block font-medium text-res-ink-muted">Full name</span>
            <input
              value={guest.guestName}
              onChange={(e) => setGuest({ ...guest, guestName: e.target.value })}
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="type-res-small mb-1.5 block font-medium text-res-ink-muted">Email</span>
              <input
                type="email"
                value={guest.guestEmail}
                onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="type-res-small mb-1.5 block font-medium text-res-ink-muted">Phone</span>
              <input
                value={guest.guestPhone}
                onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="type-res-small mb-1.5 block font-medium text-res-ink-muted">Special requests</span>
            <textarea
              value={guest.specialRequests}
              onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </label>

          <div className="space-y-3 rounded-res-md bg-res-surface p-4">
            {quote?.pricingMode === 'table' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="type-res-small font-medium text-res-ink-muted">Reservation deposit</span>
                  <span className="type-res-h3 text-res-ink">
                    {quote.minimumDeposit > 0 ? `₦${quote.minimumDeposit.toLocaleString()}` : 'Free'}
                  </span>
                </div>
                {quote.minimumDeposit > 0 ? (
                  <p className="type-res-small font-normal text-res-ink-muted">
                    This deposit is credited against your bill at the venue.
                  </p>
                ) : (
                  <p className="type-res-small font-normal text-res-ink-muted">No deposit required to reserve.</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="type-res-small font-medium text-res-ink-muted">Total</span>
                  <span className="type-res-h3 text-res-ink">
                    ₦
                    {(quote?.total ?? (pricing && pricing.mode === 'room' ? pricing.price : 0)).toLocaleString()}
                  </span>
                </div>
                {quote?.unitsKind === 'nights' && (
                  <p className="type-res-small font-normal text-res-ink-muted">
                    {quote.unitsCount} night{quote.unitsCount > 1 ? 's' : ''}
                  </p>
                )}

                {quoteQuery.isLoading && (
                  <p className="type-res-small font-normal text-res-ink-muted">Calculating price…</p>
                )}

                <div className="space-y-2">
                  {(quote?.strategies ?? []).map((entry) => {
                    const active = entry.strategy === strategy;
                    const depositAtVenue = entry.strategy === 'pay_at_venue' && entry.amount > 0;
                    return (
                      <button
                        key={entry.strategy}
                        type="button"
                        onClick={() => setStrategy(entry.strategy)}
                        aria-pressed={active}
                        className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-res-sm bg-res-card px-3.5 py-3 text-left shadow-res-low transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                          active ? 'ring-2 ring-res-brand' : ''
                        }`}
                      >
                        <span>
                          <span className="type-res-body block font-semibold text-res-ink">
                            {STRATEGY_LABEL[entry.strategy]}
                          </span>
                          <span className="type-res-small mt-0.5 block font-normal text-res-ink-muted">
                            {depositAtVenue
                              ? `Requires a ₦${entry.amount.toLocaleString()} deposit now`
                              : STRATEGY_HINT[entry.strategy]}
                          </span>
                        </span>
                        <span className="type-res-small shrink-0 rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-brand">
                          {entry.amount > 0 ? `₦${entry.amount.toLocaleString()}` : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {requiresPayment ? (
              <p className="type-res-small font-normal text-res-ink-muted">
                You&apos;ll be redirected to Paystack to complete payment.
              </p>
            ) : (
              <p className="type-res-small font-normal text-res-ink-muted">
                No online payment needed for this option.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReserveBlueprintPage;
