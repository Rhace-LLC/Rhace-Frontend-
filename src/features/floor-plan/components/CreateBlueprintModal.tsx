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
  hotel: 'Room',
  club: 'Table',
  restaurant: 'Table',
};

const VERTICAL_NAME: Record<Vertical, string> = {
  hotel: 'Hotel',
  club: 'Club',
  restaurant: 'Restaurant',
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
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const STEPS = ['Details', 'Extras & photos', 'Review'] as const;

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
  const kind = CONFIG_LABEL[vertical];

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
      setUploadError((error as Error).message || 'Photo upload failed');
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
      title={initial ? `Edit ${kind.toLowerCase()}` : `Add ${kind.toLowerCase()}`}
      subtitle={`${VERTICAL_NAME[vertical]} · Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      footer={
        step < STEPS.length - 1 ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
            >
              Cancel
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="type-res-small flex cursor-pointer items-center gap-1 rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canLeaveBasics}
              className="type-res-small flex cursor-pointer items-center gap-1 rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="type-res-small flex cursor-pointer items-center gap-1 rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canLeaveBasics}
              className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save changes' : `Save ${kind.toLowerCase()}`}
            </button>
          </>
        )
      }
    >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="bp-name">
              Name
            </label>
            <input
              id="bp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Executive Ocean Suite"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bp-type">
                Type
              </label>
              <input
                id="bp-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                list={`blueprint-type-${vertical}`}
                className={inputClass}
                placeholder="Pick one or write your own"
              />
              <datalist id={`blueprint-type-${vertical}`}>
                {TYPE_OPTIONS[vertical].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            {vertical === 'hotel' ? (
              <div>
                <label className={labelClass} htmlFor="bp-price">
                  Price per night (₦)
                </label>
                <input
                  id="bp-price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className={labelClass} htmlFor="bp-deposit">
                  Minimum deposit (₦)
                </label>
                <input
                  id="bp-deposit"
                  type="number"
                  min={0}
                  value={minimumDeposit}
                  onChange={(e) => setMinimumDeposit(e.target.value)}
                  className={inputClass}
                />
                <span className="type-res-small mt-1 block font-normal text-res-ink-muted">
                  To book. Comes off the bill. 0 means free.
                </span>
              </div>
            )}
          </div>

          {vertical === 'hotel' && (
            <div>
              <label className={labelClass} htmlFor="bp-hotel-deposit">
                Minimum deposit (₦)
              </label>
              <input
                id="bp-hotel-deposit"
                type="number"
                min={0}
                value={minimumDeposit}
                onChange={(e) => setMinimumDeposit(e.target.value)}
                className={inputClass}
              />
              <span className="type-res-small mt-1 block font-normal text-res-ink-muted">
                Taken when the guest pays. 0 means no deposit.
              </span>
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="bp-description">
              Description
            </label>
            <textarea
              id="bp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What makes this one special?"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="bp-capacity">
                Seats
              </label>
              <input id="bp-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bp-max-capacity">
                Max seats
              </label>
              <input id="bp-max-capacity" type="number" min={1} value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <span className={labelClass}>Extras & features</span>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {AMENITY_PRESETS[vertical].map((preset) => {
                const active = amenityList.includes(preset);
                return (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => toggleAmenity(preset)}
                    aria-pressed={active}
                    className={`type-res-small cursor-pointer rounded-full px-3 py-1.5 font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                      active
                        ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                        : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
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
                    className="type-res-small cursor-pointer rounded-full bg-res-brand px-3 py-1.5 font-medium text-res-ink-inverted shadow-res-low"
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
                placeholder="Add another extra"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomAmenity}
                className="type-res-small shrink-0 cursor-pointer rounded-full bg-res-surface px-4 font-semibold text-res-ink transition-colors hover:text-res-brand"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <span className={labelClass}>House rules</span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {POLICY_PRESETS[vertical].map((policy) => (
                <label
                  key={policy.id}
                  className="type-res-small flex cursor-pointer items-center gap-2 rounded-res-sm bg-res-surface px-3 py-2.5 font-normal text-res-ink"
                >
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.label)}
                    onChange={() => togglePolicy(policy.label)}
                    className="h-4 w-4 shrink-0 accent-res-brand"
                  />
                  {policy.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Photos</span>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {imageUrls.map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-res-sm bg-res-surface">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-res-card text-xs leading-none text-res-ink shadow-res-low"
                    title="Remove photo"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-res-sm border border-dashed border-res-line bg-res-surface text-res-ink-muted transition-colors hover:text-res-brand">
                <Upload size={16} />
                <span className="type-res-caption">{uploading ? `${uploadProgress}%` : 'Upload'}</span>
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
              placeholder="Or paste photo links (one per line)"
              className={inputClass}
            />
            {uploadError && (
              <p className="type-res-small mt-1.5 rounded-res-sm bg-res-surface px-3 py-2 font-normal text-res-ink-muted">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-res-md bg-res-surface p-4">
            <div className="flex items-center gap-3">
              {imageUrls[0] ? (
                <img src={imageUrls[0]} alt="" className="h-14 w-14 rounded-res-sm object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-res-sm bg-res-card shadow-res-low">
                  <span className="type-res-h3 text-res-ink-muted">
                    {(type || name || '?').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="type-res-h3 line-clamp-1 text-res-ink">{name || 'Untitled'}</h3>
                <p className="type-res-small line-clamp-1 font-normal text-res-ink-muted">{type || '—'}</p>
              </div>
              <span className="type-res-small shrink-0 rounded-full bg-res-card px-3 py-1.5 font-semibold text-res-brand shadow-res-low">
                {vertical === 'hotel'
                  ? `₦${(Number(basePrice) || 0).toLocaleString()} /night`
                  : (Number(minimumDeposit) || 0) > 0
                    ? `₦${(Number(minimumDeposit) || 0).toLocaleString()} deposit`
                    : 'Free'}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-res-sm bg-res-card p-2.5 shadow-res-low">
                <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  Seats
                </dt>
                <dd className="type-res-body mt-0.5 font-semibold text-res-ink">
                  {capacity}
                  {maxCapacity && maxCapacity !== capacity ? `–${maxCapacity}` : ''}
                </dd>
              </div>
              <div className="rounded-res-sm bg-res-card p-2.5 shadow-res-low">
                <dt className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                  Photos
                </dt>
                <dd className="type-res-body mt-0.5 font-semibold text-res-ink">
                  {imageUrls.length}
                </dd>
              </div>
            </dl>

            {description.trim() && (
              <p className="type-res-small mt-3 font-normal text-res-ink-muted">{description.trim()}</p>
            )}
          </div>

          <div>
            <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              Extras & features ({amenityList.length})
            </p>
            {amenityList.length === 0 ? (
              <p className="type-res-small font-normal text-res-ink-muted">None added</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {amenityList.map((label) => (
                  <span key={label} className="type-res-small rounded-full bg-res-surface px-3 py-1.5 font-medium text-res-ink-muted">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              House rules ({selectedPolicies.length})
            </p>
            {selectedPolicies.length === 0 ? (
              <p className="type-res-small font-normal text-res-ink-muted">None added</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedPolicies.map((label) => (
                  <li key={label} className="type-res-small flex gap-2 font-normal text-res-ink">
                    <span className="mt-1.5 inline-block size-1 shrink-0 rounded-full bg-res-brand" />
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {imageUrls.length > 0 && (
            <div>
              <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                Photos ({imageUrls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url) => (
                  <img key={url} src={url} alt="" className="h-14 w-14 rounded-res-sm object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
