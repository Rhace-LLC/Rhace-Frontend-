import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import {
  getGuestToken,
  guestStayApi,
  setGuestToken,
  type ResolvedRoom,
} from '@/services/stay.service';
import { useStayPwa } from '@/features/stay/pwa';
import StayChallenge from './StayChallenge';
import StayHub from './StayHub';

/**
 * Phase 1 guest entry: `/stay/:token` from the printed room QR.
 * Resolves the room, runs the last-name/PIN challenge, then mounts the hub.
 * Uses its own sessionStorage token — never AuthContext.
 */
const StayGate = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ResolvedRoom | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Phase 8: installable app shell + offline-capable service worker.
  useStayPwa(token);

  useEffect(() => {
    if (!token) {
      setError('This QR code is missing.');
      setLoading(false);
      return;
    }
    // Returning device with a live session skips straight to the hub.
    if (getGuestToken()) {
      setVerified(true);
    }
    guestStayApi
      .resolve(token)
      .then((resolved) => {
        if (!resolved.guestOrderingEnabled) {
          setError('Guest ordering is not enabled at this property yet.');
          return;
        }
        if (!resolved.hasActiveStay) {
          setError('There is no active stay in this room. Please check in at the front desk.');
          return;
        }
        setRoom(resolved);
      })
      .catch(() => setError('This QR code is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Couldn&apos;t open your stay</p>
        <p className="text-sm text-slate-500">{error ?? 'Invalid link.'}</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!verified || !room) {
    return (
      <StayChallenge
        room={room}
        roomToken={token}
        onVerified={(result) => {
          setGuestToken(result.token);
          setVerified(true);
          toast.success('Welcome to your stay');
        }}
      />
    );
  }

  return <StayHub roomToken={token} room={room} />;
};

export default StayGate;
