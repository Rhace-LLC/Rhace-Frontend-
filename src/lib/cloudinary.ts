import axios from 'axios';
import { envConfig } from '@/envloader';

/**
 * Direct-to-Cloudinary unsigned upload (same pattern as the onboarding flow).
 * No backend upload endpoint is involved — only the returned `secure_url` is
 * persisted.
 */

const CLOUD_NAME = envConfig.cloudinaryCloudName;
const UPLOAD_PRESET = envConfig.cloudinaryUploadPreset;

export const CLOUDINARY_CONFIGURED = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export interface CloudinaryUploadOptions {
  onProgress?: (percent: number) => void;
}

export async function uploadImageToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Image upload is not configured (missing Cloudinary env vars).');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    formData,
    {
      onUploadProgress: (event) => {
        if (options.onProgress && event.total) {
          options.onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    }
  );

  return response.data.secure_url as string;
}
