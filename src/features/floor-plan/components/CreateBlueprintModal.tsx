import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Modal } from '@/components/others/RhaceModal';
import { inventoryBlueprintService } from '@/services/inventoryBlueprint.service';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { toDomainBlueprint } from '../api/adapter';
import type { BookingPolicy, EntityShape, InventoryBlueprint, Vertical } from '../domain/types';
import type { BlueprintCategoryDto, FloorPlanVertical } from '@/types';

interface CreateBlueprintModalProps {
  vertical: Vertical;
  isOpen: boolean;
  initial?: InventoryBlueprint | null;
  onClose: () => void;
  onSaved: (blueprint: InventoryBlueprint) => void;
}

function categoryForVertical(vertical: Vertical): BlueprintCategoryDto {
  if (vertical === 'hotel') return 'room';
  if (vertical === 'club') return 'club_table';
  return 'restaurant_table';
}

const CONFIG_LABEL: Record<Vertical, string> = {
  hotel: 'Room Config',
  club: 'Table Config',
  restaurant: 'Table Config',
};

const DEFAULT_SHAPE: Record<Vertical, EntityShape> = {
  hotel: 'room',
  club: 'booth',
  restaurant: 'round',
};

const TYPE_OPTIONS: Record<Vertical, string[]> = {
  hotel: [
    'Standard',
    'Deluxe King',
    'Twin Room',
    'Family Room',
    'Studio',
    'Executive Suite',
    'Presidential Suite',
    'Penthouse',
  ],
  club: [
    'Main Floor Booth',
    'Lounge Table',
    'Bar Stool',
    'DJ Pit VIP',
    'Raised Mezzanine',
    "Owner's Box",
    'Cabana',
    'Private Room',
  ],
  restaurant: [
    'Standard 2-Top',
    'Standard 4-Top',
    'High-Top Bar',
    'Booth',
    'Communal Table',
    'Outdoor Patio',
    "Chef's Counter",
    'Private Dining Room',
  ],
};

const AMENITY_PRESETS: Record<Vertical, string[]> = {
  hotel: [
    'King Bed',
    'Queen Bed',
    'Twin Beds',
    'Ocean View',
    'City View',
    'Balcony',
    'Mini Bar',
    'Work Desk',
    'Smart TV',
    'Wi-Fi',
    'Bathtub',
    'Air Conditioning',
    'Room Service',
    'Safe',
  ],
  club: [
    'Dedicated Server',
    'Premium Bottle Setup',
    'Sparkler Presentation',
    'Security Escort',
    'Stage Sightline',
    'Private Entrance',
    'Bottle Service',
    'Coat Check',
    'Birthday Setup',
    'Table Service',
  ],
  restaurant: [
    'Power Outlets',
    'Window View',
    'Wheelchair Access',
    'High Chair Space',
    'Quiet Zone',
    'Outdoor Seating',
    'Bar Seating',
    'Booth Seating',
    'Pet Friendly',
    'Birthday Setup',
    'Candlelight Setup',
  ],
};

const POLICY_PRESETS: Record<Vertical, BookingPolicy[]> = {
  hotel: [
    { id: 'p_cancel_24', kind: 'cancellation', label: 'Free cancellation up to 24h' },
    { id: 'p_cancel_48', kind: 'cancellation', label: 'Free cancellation up to 48h' },
    { id: 'p_non_ref', kind: 'cancellation', label: 'Non-refundable' },
    { id: 'p_checkin', kind: 'check_in', label: 'Check-in from 3:00 PM' },
    { id: 'p_checkout', kind: 'check_out', label: 'Check-out by 11:00 AM' },
    { id: 'p_no_smoke', kind: 'other', label: 'No smoking' },
    { id: 'p_pets', kind: 'other', label: 'Pets allowed' },
  ],
  club: [
    { id: 'p_mins', kind: 'minimum_spend', label: 'Minimum spend required' },
    { id: 'p_dress', kind: 'dress_code', label: 'Smart / upscale dress code' },
    { id: 'p_age', kind: 'age_limit', label: '21+ only' },
    { id: 'p_entry', kind: 'entry_time', label: 'Entry by 11:30 PM' },
    { id: 'p_hold', kind: 'hold_buffer', label: 'Table held for 15 minutes' },
    { id: 'p_no_drinks', kind: 'other', label: 'No outside drinks' },
  ],
  restaurant: [
    { id: 'p_turn_90', kind: 'turn_time', label: '90-minute turn limit' },
    { id: 'p_turn_120', kind: 'turn_time', label: '2-hour turn limit' },
    { id: 'p_hold', kind: 'hold_buffer', label: '15-minute hold buffer' },
    { id: 'p_cancel_24', kind: 'cancellation', label: 'Free cancellation up to 24h' },
    { id: 'p_dress', kind: 'dress_code', label: 'Smart casual' },
    { id: 'p_no_food', kind: 'other', label: 'No outside food' },
  ],
};

const inputClass =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-teal-500 focus:outline-none';

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const STEPS = ['Basics', 'Details', 'Preview'] as const;

export function CreateBlueprintModal({
  vertical,
  isOpen,
  initial,
  onClose,
  onSaved,
}: CreateBlueprintModalProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [minimumDeposit, setMinimumDeposit] = useState('0');
  const [capacity, setCapacity] = useState('2');
  const [maxCapacity, setMaxCapacity] = useState('2');
  const [amenityList, setAmenityList] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [images, setImages] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setName(initial?.name ?? '');
    setType(initial?.type ?? '');
    setDescription(initial?.description ?? '');
    setBasePrice(String(initial?.basePrice ?? 0));
    setMinimumDeposit(String(initial?.minimumDeposit ?? 0));
    setCapacity(String(initial?.capacity ?? 2));
    setMaxCapacity(String(initial?.maxCapacity ?? initial?.capacity ?? 2));
    setAmenityList((initial?.amenities ?? []).map((a) => a.label));
    setSelectedPolicies((initial?.bookingPolicies ?? []).map((p) => p.label));
    setImages((initial?.images ?? []).join('\n'));
    setUploadError(null);
  }, [isOpen, initial]);

  const toggleAmenity = (label: string) => {
    setAmenityList((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  const addCustomAmenity = () => {
    const label = customAmenity.trim();
    if (!label || amenityList.includes(label)) return;
    setAmenityList((prev) => [...prev, label]);
    setCustomAmenity('');
  };

  const togglePolicy = (label: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    );
  };

  const handleImageFiles = async (files: FileList) => {
    const selected = Array.from(files).slice(0, 5);
    if (!selected.length) return;
    setUploading(true);
    setUploadError(null);
    const uploaded: string[] = [];
    try {
      for (const file of selected) {
        setUploadProgress(0);
        const url = await uploadImageToCloudinary(file, { onProgress: setUploadProgress });
        uploaded.push(url);
      }
      setImages((prev) => [...lines(prev), ...uploaded].join('\n'));
    } catch (error) {
      setUploadError((error as Error).message || 'Image upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => lines(prev).filter((entry) => entry !== url).join('\n'));
  };

  const buildPolicies = (): BookingPolicy[] =>
    selectedPolicies.map((label) => {
      const preset = POLICY_PRESETS[vertical].find((p) => p.label === label);
      return preset ?? { id: `policy_${slug(label)}`, kind: 'other', label };
    });

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        vertical: vertical as FloorPlanVertical,
        category: categoryForVertical(vertical),
        name: name.trim(),
        type: type.trim() || name.trim(),
        // Rooms are priced; tables are not (they only carry a minimum deposit).
        basePrice: vertical === 'hotel' ? Number(basePrice) || 0 : 0,
        minimumDeposit: Number(minimumDeposit) || 0,
        currency: 'NGN',
        capacity: Number(capacity) || 1,
        maxCapacity: Number(maxCapacity) || Number(capacity) || 1,
        canvasShape: DEFAULT_SHAPE[vertical],
        description: description.trim(),
        allowedPaymentStrategies: [],
        amenities: amenityList.map((label) => ({ id: slug(label), label })),
        bookingPolicies: buildPolicies(),
        images: lines(images),
      };
      const response = initial?.id
        ? await inventoryBlueprintService.update(initial.id, payload)
        : await inventoryBlueprintService.create(payload);
      if (response.data) onSaved(toDomainBlueprint(response.data));
      else onClose();
    } finally {
      setSaving(false);
    }
  };

  const canLeaveBasics = name.trim().length > 0;
  const imageUrls = lines(images);

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => undefined : onClose}
      title={initial ? `Edit ${CONFIG_LABEL[vertical]}` : `Create a ${CONFIG_LABEL[vertical]}`}
      subtitle={`${vertical.charAt(0).toUpperCase() + vertical.slice(1)} · step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      footer={
        step < STEPS.length - 1 ? (
          <>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canLeaveBasics}
              className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canLeaveBasics}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Save Blueprint'}
            </button>
          </>
        )
      }
    >
      {step === 0 && (
        <div className="space-y-4 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Blueprint Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Executive Ocean Suite"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Type</span>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                list={`blueprint-type-${vertical}`}
                className={inputClass}
                placeholder="Select or type your own"
              />
              <datalist id={`blueprint-type-${vertical}`}>
                {TYPE_OPTIONS[vertical].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            {vertical === 'hotel' ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Price per night (₦)</span>
                <input
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Minimum deposit (₦)</span>
                <input
                  type="number"
                  min={0}
                  value={minimumDeposit}
                  onChange={(e) => setMinimumDeposit(e.target.value)}
                  className={inputClass}
                />
                <span className="mt-1 block text-[11px] text-gray-400">
                  Required to reserve. Credited against the bill. 0 = free.
                </span>
              </label>
            )}
          </div>

          {vertical === 'hotel' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Minimum deposit (₦)
              </span>
              <input
                type="number"
                min={0}
                value={minimumDeposit}
                onChange={(e) => setMinimumDeposit(e.target.value)}
                className={inputClass}
              />
              <span className="mt-1 block text-[11px] text-gray-400">
                Required to confirm when the guest pays at checkout. 0 = no deposit.
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this configuration…"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Capacity</span>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Max Capacity</span>
              <input type="number" min={1} value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className={inputClass} />
            </label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 text-sm">
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Amenities</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {AMENITY_PRESETS[vertical].map((preset) => {
                const active = amenityList.includes(preset);
                return (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => toggleAmenity(preset)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
              {amenityList
                .filter((label) => !AMENITY_PRESETS[vertical].includes(label))
                .map((label) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleAmenity(label)}
                    className="rounded-full bg-teal-600 px-3 py-1.5 text-[11px] font-medium text-white"
                  >
                    {label} ×
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomAmenity();
                  }
                }}
                placeholder="Add another amenity"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomAmenity}
                className="shrink-0 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Booking Policies</span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {POLICY_PRESETS[vertical].map((policy) => (
                <label
                  key={policy.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.label)}
                    onChange={() => togglePolicy(policy.label)}
                  />
                  {policy.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Image Gallery</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {imageUrls.map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute right-0 top-0 rounded-bl bg-black/60 px-1 text-[10px] leading-tight text-white hover:bg-black/80"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-teal-400 hover:text-teal-500">
                <Upload size={16} />
                <span className="text-[9px]">{uploading ? `${uploadProgress}%` : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files) handleImageFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <textarea
              value={images}
              onChange={(e) => setImages(e.target.value)}
              rows={2}
              placeholder="Or paste image URLs (one per line)"
              className={inputClass}
            />
            {uploadError && <p className="mt-1 text-[11px] text-red-500">{uploadError}</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {imageUrls[0] ? (
                <img src={imageUrls[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white">
                  {(type || name || '?').slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-900">{name || 'Untitled'}</h3>
                <p className="truncate text-xs text-gray-500">{type || '—'}</p>
              </div>
              <span className="ml-auto rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                {vertical === 'hotel'
                  ? `₦${(Number(basePrice) || 0).toLocaleString()} /night`
                  : (Number(minimumDeposit) || 0) > 0
                    ? `₦${(Number(minimumDeposit) || 0).toLocaleString()} deposit`
                    : 'Free'}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-gray-500">Capacity</dt>
              <dd className="text-gray-900">
                {capacity}
                {maxCapacity && maxCapacity !== capacity ? `–${maxCapacity}` : ''}
              </dd>
              <dt className="text-gray-500">Currency</dt>
              <dd className="text-gray-900">NGN (₦)</dd>
            </dl>

            {description.trim() && (
              <p className="mt-3 text-xs text-gray-600">{description.trim()}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Amenities ({amenityList.length})</p>
            {amenityList.length === 0 ? (
              <p className="text-xs text-gray-400">None selected</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {amenityList.map((label) => (
                  <span key={label} className="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] text-gray-600">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">
              Booking policies ({selectedPolicies.length})
            </p>
            {selectedPolicies.length === 0 ? (
              <p className="text-xs text-gray-400">None selected</p>
            ) : (
              <ul className="space-y-1 text-xs text-gray-600">
                {selectedPolicies.map((label) => (
                  <li key={label}>· {label}</li>
                ))}
              </ul>
            )}
          </div>

          {imageUrls.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Gallery ({imageUrls.length})</p>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url) => (
                  <img key={url} src={url} alt="" className="h-14 w-14 rounded-md object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
