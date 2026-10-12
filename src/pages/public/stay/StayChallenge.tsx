import { useState } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { guestStayApi, type ChallengeResult, type ResolvedRoom } from '@/services/stay.service';

interface Props {
  room: ResolvedRoom | null;
  roomToken: string;
  onVerified: (result: ChallengeResult) => void;
}

/** Phase 1 identity challenge: last name and/or 4-digit guest PIN. */
const StayChallenge = ({ room, roomToken, onVerified }: Props) => {
  const [mode, setMode] = useState<'lastName' | 'pin'>(() =>
    room?.challenge.includes('lastName') ? 'lastName' : 'pin',
  );
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    mode === 'lastName' ? lastName.trim().length > 0 : pin.replace(/\D/g, '').length === 4;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await guestStayApi.challenge({
        roomToken,
        ...(mode === 'lastName' ? { lastName: lastName.trim() } : { pin }),
        deviceLabel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : undefined,
      });
      onVerified(result);
    } catch {
      setError('Could not verify your stay. Check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          {room?.hotelName ?? 'Welcome'}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {room ? `Room ${room.roomLabel}` : 'Your stay'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Verify it&apos;s you to unlock ordering and your bill.
        </p>
      </div>

      {room && room.challenge.length > 1 && (
        <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
          {(['lastName', 'pin'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === m ? 'bg-white shadow' : 'text-slate-500'
              }`}
            >
              {m === 'lastName' ? 'Last name' : 'Guest PIN'}
            </button>
          ))}
        </div>
      )}

      {mode === 'lastName' ? (
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Last name on the reservation"
          autoComplete="family-name"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
        />
      ) : (
        <div className="flex justify-center">
          <InputOTP maxLength={4} value={pin} onChange={setPin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}
      {mode === 'pin' && (
        <p className="text-center text-xs text-slate-400">
          The 4-digit PIN from check-in (ask the front desk if you lost it).
        </p>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Verifying…' : 'Unlock my stay'}
      </button>
    </div>
  );
};

export default StayChallenge;
