import api from '@/lib/axios';

class AuthService {
  // Users Auth
  async login(email: string, password: string) {
    const res = await api.post('/auth/users/login', { email, password });
    const { accessToken } = res.data;

    localStorage.setItem('token', accessToken);
    return res.data;
  }

  async register(userData: Record<string, unknown>) {
    const res = await api.post('/auth/users/register', userData);
    return res.data;
  }

  async verifyOTP(email: string, otp: string) {
    const res = await api.post('/auth/users/verify-otp', { email, otp });
    return res.data;
  }

  async resendOTP(email: string) {
    const res = await api.post('/auth/users/resend-otp', { email });
    return res.data;
  }

  async forgotPassword(email: string) {
    const res = await api.post('/auth/users/forgot-password', { email });
    return res.data;
  }

  async resetPassword(token: string, password: string) {
    const res = await api.post('/auth/users/reset-password', {
      token,
      password,
    });
    return res.data;
  }

  async googleLogin(code: string) {
    const res = await api.post('/auth/users/login/google', {
      code,
    });
    const { accessToken } = res.data;

    localStorage.setItem('token', accessToken);
    return res.data;
  }

  async googleRegister(code: string) {
    const res = await api.post('/auth/users/register/google', {
      code,
    });
    const { accessToken } = res.data;

    localStorage.setItem('token', accessToken);
    return res.data;
  }

  // Vendors Auth
  async vendorLogin(email: string, password: string) {
    const res = await api.post('/auth/vendors/login', { email, password });
    console.log('vendorLogin response:', res.data);
    const token = res.data.accessToken || res.data.token;
    if (!token) {
      throw new Error('Login response missing token');
    }
    localStorage.setItem('token', token);

    return res.data;
  }

  async vendorUpdate(formData: Record<string, unknown>, vendorId?: string) {
    const id = vendorId || (formData?._id as string) || (formData?.id as string);
    const res = await api.put(`/vendors/${id}`, formData);
    return res.data;
  }

  async vendorRegister({ businessName, email, password }: { businessName: string; email: string; password: string }) {
    const res = await api.post('/auth/vendors/register', {
      businessName,
      email,
      password,
    });
    return res.data;
  }

  async vendorForgotPassword(email: string) {
    const res = await api.post('/auth/vendors/forgot-password', { email });
    return res.data;
  }

  async vendorResetPassword(token: string, password: string) {
    const res = await api.post('/auth/vendors/reset-password', {
      token,
      password,
    });
    return res.data;
  }

  async vendorVerifyOTP(email: string, otp: string) {
    const res = await api.post('/auth/vendors/verify-otp', { email, otp });
    return res.data;
  }

  async vendorResendOTP(email: string) {
    const res = await api.post('/auth/vendors/resend-otp', { email });
    return res.data;
  }

  async vendorOnboard(vendorData: Record<string, unknown>) {
    const res = await api.post('/auth/vendors/onboard', vendorData);
    return res.data;
  }

  // Admin routes
  async adminLogin(email: string, password: string) {
    const res = await api.post('/auth/admin/login', { email, password });
    const { token } = res.data;

    localStorage.setItem('token', token);
    return res.data;
  }

  async adminRegister(adminData: Record<string, unknown>) {
    const res = await api.post('/auth/admin/register', adminData);
    return res.data;
  }
}

export const authService = new AuthService();
