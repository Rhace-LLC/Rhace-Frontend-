import HeroImage from '@/components/auth/HeroImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { staffService } from '@/services/staff.service';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import ForgotImage from '@/public/auth/forgot.svg';

const StaffForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    try {
      setIsLoading(true);
      await staffService.forgotPassword(email);
      toast.success('A reset password link has been sent to your email');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Staff not found';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex p-4 bg-white">
      <div className="h-screen overflow-auto flex-1 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md p-0 shadow-none border-none">
          <CardHeader className="flex justify-center">
            <img src={ForgotImage} alt="Forgot password" className="w-48 h-48 object-contain" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900">Forgot Your Password?</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Enter your registered email below to receive password reset instructions.
              </p>
            </div>
            <div className="space-y-6">
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 sm:h-12 rounded-md border-gray-100 bg-gray-100 text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:border-[#0A6C6D] focus:ring-1 focus:ring-[#0A6C6D] hover:border-[#0A6C6D] transition-all duration-300 ease-in-out pl-3"
              />
              <Button
                disabled={isLoading}
                onClick={handleSubmit}
                className="w-full py-6 rounded-md bg-[#0A6C6D] text-white text-sm font-light transition-transform duration-200 hover:shadow-lg hover:bg-[#0A6C6D]"
                size="lg"
              >
                {isLoading ? (
                  <>
                    {' '}
                    Loading <Loader2 className="animate-spin" />
                  </>
                ) : (
                  'Send'
                )}
              </Button>
            </div>
            <div className="text-center">
              <a
                href="/auth/staff/login"
                className="text-sm text-[#0A6C6D] hover:text-[#074f55] font-medium transition-all"
              >
                Back to Login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
      <HeroImage role="vendor" />
    </div>
  );
};

export default StaffForgotPassword;
