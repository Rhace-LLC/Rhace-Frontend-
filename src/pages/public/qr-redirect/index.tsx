import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { ordersApi } from '@/features/orders';

/** Resolves a scanned per-table QR token, then forwards to the quick-order page. */
const QrRedirectPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    ordersApi
      .resolveQrToken(token)
      .then((resolved) => {
        navigate(
          `/order/${resolved.vendorId}${resolved.unitId ? `?unit=${resolved.unitId}` : ''}`,
          { replace: true }
        );
      })
      .catch(() => {
        toast.error('This QR code is invalid or has expired.');
        navigate('/', { replace: true });
      });
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <UniversalLoader />
    </div>
  );
};

export default QrRedirectPage;
