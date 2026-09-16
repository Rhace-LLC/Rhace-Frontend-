import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { staffService } from '@/services/staff.service';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStaff } from '@/types';

const AcceptInvitePage = () => {
  const { setStaff } = useAuth();
  const [status, setStatus] = useState<'loading' | 'set-password' | 'accepted' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('inviteToken') || '';
  const resetToken = searchParams.get('resetToken') || '';
  const navigate = useNavigate();

  useEffect(() => {
    if (!inviteToken) {
      setError('This invitation link is missing its token.');
      setStatus('error');
      return;
    }
    let active = true;
    staffService
      .acceptInvite(inviteToken)
      .then(() => {
        if (!active) return;
        setStatus(resetToken ? 'set-password' : 'accepted');
      })
      .catch((err) => {
        if (!active) return;
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Invalid or expired invite token',
        );
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [inviteToken, resetToken]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[#0A6C6D]" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Link Expired</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button className="w-full" onClick={() => navigate('/auth/staff/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Invitation Accepted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'accepted' ? (
            <>
              <p className="text-muted-foreground">
                Your invitation has been accepted. You can now log in with your email, or reset your
                password if you don&apos;t have one yet.
              </p>
              <Button className="w-full" onClick={() => navigate('/auth/staff/login')}>
                Go to Login
              </Button>
            </>
          ) : (
            <PasswordSetupForm
              onComplete={(staff) => {
                if (staff) setStaff(staff);
                navigate('/staff');
              }}
              resetToken={resetToken}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitePage;

interface PasswordSetupFormProps {
  resetToken: string;
  onComplete: (staff?: AuthStaff) => void;
}

const PasswordSetupForm = ({ resetToken, onComplete }: PasswordSetupFormProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await staffService.setPassword(resetToken, password);
      toast.success('Password set. Welcome aboard!');
      onComplete(res.staff as AuthStaff);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to set password. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-muted-foreground">
        Set a password to finish setting up your account. You&apos;ll be logged in automatically.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
      </Button>
    </form>
  );
};
