import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { staffService } from '@/services/staff.service';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import HeroImage from '@/components/auth/HeroImage';
import logo from '@/public/images/Rhace-11.png';

const getCurrentYear = () => new Date().getFullYear();

const StaffLogin = () => {
  const { setStaff } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({ email: '', password: '' });
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/staff';

  const formValidation = () => {
    if (!formData.email) {
      setError((prev) => ({ ...prev, email: 'Email is required.' }));
      return false;
    }
    if (!formData.password) {
      setError((prev) => ({ ...prev, password: 'Password is required.' }));
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!formValidation()) return;
    setError({ email: '', password: '' });
    try {
      setIsLoading(true);
      const res = await staffService.login(formData.email, formData.password);
      setStaff(res.staff);
      toast.success(`Welcome back, ${res.staff?.name ?? 'Staff'}!`);
      navigate(redirectTo);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid email or password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full h-screen flex p-4 bg-white">
      <div className="flex-1 h-full overflow-y-auto hide-scrollbar">
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md bg-white shadow-none p-0 border-none">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-2">
                <img src={logo} alt="Rhace Logo" className="w-20 h-20 object-contain" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Staff Login</h1>
              <p className="text-sm text-gray-600">
                Sign in to your workspace to start your shift.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full h-10 sm:h-12 rounded-md border-gray-100 bg-gray-100 text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:border-[#0A6C6D] focus:ring-1 focus:ring-[#0A6C6D] hover:border-[#0A6C6D] transition-all duration-300 ease-in-out pl-3"
                />
                {error.email && <p className="text-sm text-red-600 mt-1">{error.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    placeholder="********"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full h-10 sm:h-12 rounded-md border-gray-100 bg-gray-100 text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:border-[#0A6C6D] focus:ring-1 focus:ring-[#0A6C6D] hover:border-[#0A6C6D] transition-all duration-300 ease-in-out pl-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error.password && <p className="text-sm text-red-600 mt-1">{error.password}</p>}
              </div>
              <div className="flex justify-end">
                <a
                  href="/auth/staff/forgot-password"
                  className="text-sm text-[#0A6C6D] hover:text-[#074f55] font-medium transition-all"
                >
                  Forgot password?
                </a>
              </div>
              <Button
                variant="default"
                disabled={!formData.email || !formData.password || isLoading}
                onClick={handleLogin}
                className="w-full py-6 rounded-md bg-[#0A6C6D] text-white text-sm font-light transition-transform duration-200 hover:shadow-lg hover:bg-[#0A6C6D] mt-5"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    Loading <Loader2 className="animate-spin" />
                  </span>
                ) : (
                  'Login'
                )}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <div className="flex flex-col md:flex-row justify-between items-center w-full text-xs text-gray-500">
                <span>Copyright © {getCurrentYear()} Rhace Enterprises LTD.</span>
                <a href="#" className="hover:underline">
                  Privacy Policy
                </a>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      <HeroImage role="vendor" />
    </div>
  );
};

export default StaffLogin;
