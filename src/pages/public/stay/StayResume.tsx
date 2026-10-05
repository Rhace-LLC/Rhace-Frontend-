import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getLastRoomToken } from '@/features/stay/pwa';

/**
 * Phase 8: start page of the installed stay app (`start_url`). Re-opens the
 * room this device last scanned; otherwise asks the guest to scan the QR.
 * The guest still verifies again if their session has ended.
 */
const StayResume = () => {
  const navigate = useNavigate();
  const token = getLastRoomToken();

  useEffect(() => {
    if (token) navigate(`/stay/${token}`, { replace: true });
  }, [token, navigate]);

  if (token) return null;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <img src="/stay-icons/icon-192.png" alt="" className="h-16 w-16 rounded-2xl" />
      <h1 className="text-xl font-bold">Scan your room QR code</h1>
      <p className="text-sm text-slate-500">
        Use your phone camera on the QR code in your room to open your stay.
      </p>
    </main>
  );
};

export default StayResume;
