/**
 * Application Environment Configuration
 * Centralized object mimicking "const env = process.env"
 */
export const envConfig = Object.freeze({
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  cloudinaryUploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  cloudinaryCloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,

  // Built-in Vite environment helpers
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
});

// Optional: Fallback check to alert you during development if a variable is missing
if (import.meta.env.DEV) {
  Object.entries(envConfig).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      console.warn(`⚠️ Environmental variable warning: "${key}" is currently undefined or empty.`);
    }
  });
}
