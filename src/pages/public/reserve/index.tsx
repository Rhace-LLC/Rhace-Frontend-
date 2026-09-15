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
  'w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-gray-800 focus:border-[#0A6C6D] focus:outline-none';

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
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="mx-auto md:mt-[85px] mb-[160px] md:mb-8 md:py-8 max-w-7xl md:px-6 lg:px-8 space-y-10">
        <nav className="mb-4 flex items-center gap-1 px-4 text-xs text-gray-500 md:px-0">
          <Link to={`/${SEGMENT[vertical]}/${id}`} className="hover:text-[#0A6C6D]">
            Back to venue
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">{blueprint?.name ?? 'Reservation'}</span>
        </nav>

        <div className="space-y-6">
          <div className="space-y-4 px-4 md:px-0">
            {blueprint ? (
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {blueprint.images[0] ? (
                  <img
                    src={blueprint.images[0]}
                    alt={blueprint.name}
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-[#0A6C6D] text-xl font-semibold text-white">
                    {blueprint.type}
                  </div>
                )}

                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-semibold text-[#111827]">{blueprint.name}</h1>
                      <p className="text-sm text-gray-500">{blueprint.type}</p>
                    </div>
                    <span className="text-right text-2xl font-bold text-gray-900">
                      {pricing?.mode === 'room' ? (
                        <>
                          ₦{pricing.price.toLocaleString()}
                          <span className="text-sm font-normal text-gray-500"> /night</span>
                        </>
                      ) : pricing?.mode === 'table' ? (
                        pricing.isFree ? (
                          <span className="text-base font-medium text-emerald-600">
                            Free reservation
                          </span>
                        ) : (
                          <>
                            ₦{pricing.minimumDeposit.toLocaleString()}
                            <span className="text-sm font-normal text-gray-500"> deposit</span>
                          </>
                        )
                      ) : null}
                    </span>
                  </div>

                  {blueprint.description && (
                    <p className="text-sm text-gray-600">{blueprint.description}</p>
                  )}

                  <dl className="grid grid-cols-2 gap-y-2 text-xs">
                    <dt className="text-gray-500">Capacity</dt>
                    <dd className="text-gray-900">
                      {blueprint.capacity}
                      {blueprint.maxCapacity && blueprint.maxCapacity !== blueprint.capacity
                        ? `–${blueprint.maxCapacity}`
                        : ''}
                    </dd>
                    <dt className="text-gray-500">Currency</dt>
                    <dd className="text-gray-900">NGN (₦)</dd>
                  </dl>

                  {blueprint.amenities.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {blueprint.amenities.map((amenity) => (
                          <span
                            key={amenity.id}
                            className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600"
                          >
                            {amenity.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {blueprint.bookingPolicies.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Booking policies</p>
                      <ul className="space-y-0.5 text-xs text-gray-600">
                        {blueprint.bookingPolicies.map((policy) => (
                          <li key={policy.id}>· {policy.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {blueprint.images.length > 1 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Gallery</p>
                      <div className="flex flex-wrap gap-2">
                        {blueprint.images.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="h-16 w-16 rounded-md object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : blueprintsQuery.isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
                This reservation option is no longer available.
              </div>
            )}
          </div>

          <div className="space-y-4 px-4 md:px-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                {vertical === 'hotel' ? 'Select dates' : 'Select a date'}
              </h2>
              <div className="mt-3">
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

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <BlueprintAvailabilityView
                planId={planId}
                blueprintId={blueprintId!}
                start={selection.start}
                end={selection.end}
              />
            </div>

            <button
              type="button"
              disabled={!selection.ready || !partySelectable || holdMutation.isPending}
              onClick={handleContinue}
              className="w-full rounded-xl bg-[#0A6C6D] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0A6C6D]/90 disabled:opacity-50"
            >
              {holdMutation.isPending ? 'Holding…' : 'Continue to confirm'}
            </button>
            {!partySelectable && (
              <p className="text-center text-[11px] text-rose-500">
                This option seats up to {blueprint?.maxCapacity ?? '—'} guests.
              </p>
            )}
            {!user && (
              <p className="text-center text-[11px] text-gray-400">
                You’ll be asked to sign in before confirming.
              </p>
            )}
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
        subtitle={unitLabel ? `Unit ${unitLabel} held` : 'Complete your details'}
        footer={
          <>
            <button
              onClick={handleCloseConfirm}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!guest.guestName.trim() || submitting || confirmMutation.isPending}
              className="rounded-lg bg-[#0A6C6D] px-4 py-2 text-xs font-medium text-white hover:bg-[#0A6C6D]/90 disabled:opacity-50"
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
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-[#E7F0F0] px-3 py-2 text-xs">
            <span className="text-gray-600">Hold expires in</span>
            <span className="font-mono text-base font-semibold text-[#0A6C6D]">
              {formatCountdown(remainingMs)}
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Full name</span>
            <input
              value={guest.guestName}
              onChange={(e) => setGuest({ ...guest, guestName: e.target.value })}
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Email</span>
              <input
                type="email"
                value={guest.guestEmail}
                onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Phone</span>
              <input
                value={guest.guestPhone}
                onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Special requests</span>
            <textarea
              value={guest.specialRequests}
              onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </label>

          <div className="space-y-3 rounded-xl border border-gray-200 p-3">
            {quote?.pricingMode === 'table' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Reservation deposit</span>
                  <span className="text-base font-semibold text-gray-900">
                    {quote.minimumDeposit > 0 ? `₦${quote.minimumDeposit.toLocaleString()}` : 'Free'}
                  </span>
                </div>
                {quote.minimumDeposit > 0 ? (
                  <p className="text-[11px] text-gray-400">
                    This deposit is credited against your bill at the venue.
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400">No deposit required to reserve.</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Total</span>
                  <span className="text-base font-semibold text-gray-900">
                    ₦
                    {(quote?.total ?? (pricing && pricing.mode === 'room' ? pricing.price : 0)).toLocaleString()}
                  </span>
                </div>
                {quote?.unitsKind === 'nights' && (
                  <p className="text-[11px] text-gray-400">
                    {quote.unitsCount} night{quote.unitsCount > 1 ? 's' : ''}
                  </p>
                )}

                {quoteQuery.isLoading && (
                  <p className="text-xs text-gray-400">Calculating price…</p>
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
                        className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#0A6C6D] bg-[#0A6C6D]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>
                          <span className="block text-xs font-medium text-gray-800">
                            {STRATEGY_LABEL[entry.strategy]}
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            {depositAtVenue
                              ? `Requires a ₦${entry.amount.toLocaleString()} deposit now`
                              : STRATEGY_HINT[entry.strategy]}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs font-semibold text-gray-900">
                          {entry.amount > 0 ? `₦${entry.amount.toLocaleString()}` : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {requiresPayment ? (
              <p className="text-[11px] text-gray-400">
                You’ll be redirected to Paystack to complete payment.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">
                No online payment needed for this option.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReserveBlueprintPage;
