import { envConfig } from '@/envloader';
import { clearAuthStorage } from '@/contexts/authSession';
import { getStaffRefreshToken, setStaffRefreshToken } from '@/lib/storage';
import axios from 'axios';

// Force absolute protocol sanitization to prevent accidental HTTPS upgrades on localhost
const sanitizedBaseUrl = envConfig.apiBaseUrl?.includes('localhost')
  ? envConfig.apiBaseUrl.replace('https://', 'http://')
  : envConfig.apiBaseUrl;

const api = axios.create({
  baseURL: sanitizedBaseUrl,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

/** Refresh calls must never trigger another refresh attempt (infinite loop). */
const isRefreshCall = (url?: string): boolean =>
  Boolean(url && url.includes('/auth/refresh'));

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // FIX 1: Correctly extract originalRequest from the error argument object
    const originalRequest = (error as { config?: import('axios').InternalAxiosRequestConfig })
      .config;

    // Handle 401 Unauthorized token refresh loop
    if (
      (error as { response?: { status?: number } }).response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall(originalRequest.url)
    ) {
      originalRequest._retry = true; // Mark as retried to avoid infinite loops

      try {
        // Staff sessions refresh with a rotating token in the body; every other
        // role refreshes through the http-only cookie endpoint.
        const staffRefreshToken = getStaffRefreshToken();
        const { data } = staffRefreshToken
          ? await api.post('/staff/auth/refresh', { refreshToken: staffRefreshToken })
          : await api.post('/auth/refresh', {}, { withCredentials: true });

        if (staffRefreshToken) setStaffRefreshToken(data.refreshToken ?? staffRefreshToken);

        localStorage.setItem('token', data.accessToken);

        // FIX 2: Correctly re-assign the brand new token to headers
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        // Re-execute original request with fresh credentials
        return api(originalRequest);
      } catch (refreshError) {
        // Clear all session storage scopes completely if refresh fails
        setStaffRefreshToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('vendor-token');
        localStorage.removeItem('vendor_token');

        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/dashboard/admin')) {
            window.location.href = '/auth/admin/login';
          } else if (currentPath.startsWith('/staff')) {
            window.location.href = '/auth/staff/login';
          } else if (currentPath.startsWith('/dashboard/')) {
            window.location.href = '/auth/vendor/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle specific JWT expiration actions
    if (
      (error as { response?: { status?: number } }).response?.status === 401 &&
      (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
        'jwt expired'
    ) {
      // FIX 3: Ensure your dispatch handler catches this action profile smoothly
      clearAuthStorage();
    }

    return Promise.reject(error);
  }
);

export default api;
