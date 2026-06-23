import { envConfig } from '@/envloader';
import { logoutAsync } from '@/redux/slices/authSlice';
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
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // FIX 1: Correctly extract originalRequest from the error argument object
    const originalRequest = error.config;

    // Handle 401 Unauthorized token refresh loop
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried to avoid infinite loops

      try {
        // Use the instance base URL directly for refreshing
        const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });

        localStorage.setItem('token', data.accessToken);

        // FIX 2: Correctly re-assign the brand new token to headers
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        // Re-execute original request with fresh credentials
        return api(originalRequest);
      } catch (refreshError) {
        // Clear all session storage scopes completely if refresh fails
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('vendor-token');
        localStorage.removeItem('vendor_token');

        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/dashboard/admin')) {
            window.location.href = '/auth/admin/login';
          } else if (currentPath.startsWith('/dashboard/')) {
            window.location.href = '/auth/vendor/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle specific JWT expiration actions
    if (error.response?.status === 401 && error.response?.data?.error === 'jwt expired') {
      // FIX 3: Ensure your dispatch handler catches this action profile smoothly
      logoutAsync();
    }

    return Promise.reject(error);
  }
);

export default api;
