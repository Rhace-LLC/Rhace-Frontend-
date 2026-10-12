import { useRef, useState } from 'react';
import axios from 'axios';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface GalleryEditorProps {
  /** Current image URLs. */
  value?: string[];
  onChange: (urls: string[]) => void;
  /** Helper shown under the grid. */
  hint?: string;
  /** Max photos (default 10). */
  max?: number;
}

/**
 * Modern gallery editor for vendor photos (logo-adjacent branding + listing
 * galleries). Same Cloudinary unsigned upload as onboarding; tactile grid
 * with hover-to-remove tiles and a dashed add tile.
 */
export const GalleryEditor = ({ value, onChange, hint, max = 10 }: GalleryEditorProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const images = value ?? [];

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.info(`You can upload up to ${max} photos.`);
      return;
    }
    setUploading(true);
    try {
      const picked = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const file of picked) {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', UPLOAD_PRESET);
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          form
        );
        if (response.data?.secure_url) uploaded.push(response.data.secure_url);
      }
      if (uploaded.length) {
        onChange([...images, ...uploaded]);
        toast.success(uploaded.length > 1 ? `${uploaded.length} photos added` : 'Photo added');
      }
    } catch (error) {
      console.error('Gallery upload failed:', error);
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group/image relative aspect-[4/3] overflow-hidden rounded-res-sm border border-res-line bg-res-surface"
          >
            <img
              src={url}
              alt={`Gallery photo ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-full bg-res-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white">
              {index + 1}
            </span>
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => removeAt(index)}
              className="absolute right-2 top-2 cursor-pointer rounded-full bg-res-card p-1.5 text-red-600 shadow-res-low transition-all outline-none hover:bg-red-600 hover:text-white focus-visible:ring-2 focus-visible:ring-red-500 md:opacity-0 md:group-hover/image:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= max}
          className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-res-sm border-2 border-dashed border-res-line bg-res-card text-res-ink-muted transition-colors outline-none hover:border-res-brand hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-wait disabled:opacity-60"
        >
          {uploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-res-brand border-t-transparent" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="type-res-small font-semibold">Add photos</span>
              <span className="text-[11px] font-normal">
                {images.length}/{max}
              </span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {hint && <p className="type-res-small mt-2 font-normal text-res-ink-muted">{hint}</p>}
    </div>
  );
};

export default GalleryEditor;
