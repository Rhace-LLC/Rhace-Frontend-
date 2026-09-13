import { useEffect, useState } from 'react';
import { Modal } from '@/components/others/RhaceModal';
import { inventoryBlueprintService } from '@/services/inventoryBlueprint.service';
import { toDomainBlueprint } from '../api/adapter';
import type { BookingPolicy, EntityShape, InventoryBlueprint, PaymentStrategy, Vertical } from '../domain/types';
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

const PAYMENT_OPTIONS: Array<{ value: PaymentStrategy; label: string }> = [
  { value: 'full_prepayment', label: 'Full Prepayment' },
  { value: 'deposit_50_percent', label: '50% Deposit Upfront' },
  { value: 'pay_at_venue', label: 'Pay at Venue' },
  { value: 'hold_card_authorization', label: 'Card Authorization Hold' },
];

const SHAPE_OPTIONS: EntityShape[] = ['rect', 'square', 'rectangle', 'round', 'oval', 'booth', 'room', 'bar-seat'];

const AMENITY_PRESETS: Record<Vertical, string[]> = {
  hotel: ['King Bed', 'Ocean View', 'Mini Bar', 'Work Desk', 'Balcony'],
  club: ['Dedicated Server', 'Premium Bottle Setup', 'Sparkler Presentation', 'Security Escort', 'Stage Sightline'],
  restaurant: ['Power Outlets', 'Window View', 'Wheelchair Access', 'High Chair Space', 'Quiet Zone'],
};

const inputClass =
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-teal-500 focus:outline-none';

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function CreateBlueprintModal({
  vertical,
  isOpen,
  initial,
  onClose,
  onSaved,
}: CreateBlueprintModalProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [capacity, setCapacity] = useState('2');
  const [maxCapacity, setMaxCapacity] = useState('2');
  const [canvasShape, setCanvasShape] = useState<EntityShape>('rect');
  const [payments, setPayments] = useState<PaymentStrategy[]>(['pay_at_venue']);
  const [amenities, setAmenities] = useState('');
  const [policies, setPolicies] = useState('');
  const [images, setImages] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? '');
    setType(initial?.type ?? '');
    setBasePrice(String(initial?.basePrice ?? 0));
    setCapacity(String(initial?.capacity ?? 2));
    setMaxCapacity(String(initial?.maxCapacity ?? initial?.capacity ?? 2));
    setCanvasShape((initial?.canvasShape as EntityShape) ?? 'rect');
    setPayments(initial?.allowedPaymentStrategies ?? ['pay_at_venue']);
    setAmenities((initial?.amenities ?? []).map((a) => a.label).join('\n'));
    setPolicies((initial?.bookingPolicies ?? []).map((p) => p.label).join('\n'));
    setImages((initial?.images ?? []).join('\n'));
  }, [isOpen, initial]);

  const togglePayment = (value: PaymentStrategy) => {
    setPayments((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const toggleAmenity = (label: string) => {
    const current = lines(amenities);
    const next = current.includes(label)
      ? current.filter((a) => a !== label)
      : [...current, label];
    setAmenities(next.join('\n'));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const bookingPolicies: BookingPolicy[] = lines(policies).map((label, index) => ({
      id: `policy_${index}_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      kind: 'other',
      label,
    }));
    const amenityLabels = lines(amenities);

    setSaving(true);
    try {
      const payload = {
        vertical: vertical as FloorPlanVertical,
        category: categoryForVertical(vertical),
        name: name.trim(),
        type: type.trim() || name.trim(),
        basePrice: Number(basePrice) || 0,
        capacity: Number(capacity) || 1,
        maxCapacity: Number(maxCapacity) || Number(capacity) || 1,
        canvasShape,
        allowedPaymentStrategies: payments,
        amenities: amenityLabels.map((label) => ({
          id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label,
        })),
        bookingPolicies,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? `Edit ${CONFIG_LABEL[vertical]}` : `Create a ${CONFIG_LABEL[vertical]}`}
      subtitle={`${vertical.charAt(0).toUpperCase() + vertical.slice(1)} · specs, pricing, policies`}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Blueprint'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Blueprint Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Executive Ocean Suite" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Type</span>
            <input value={type} onChange={(e) => setType(e.target.value)} className={inputClass} placeholder="Deluxe King" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Base Price ($)</span>
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Capacity</span>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Max Capacity</span>
            <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Canvas Shape</span>
            <select value={canvasShape} onChange={(e) => setCanvasShape(e.target.value as EntityShape)} className={inputClass}>
              {SHAPE_OPTIONS.map((shape) => (
                <option key={shape} value={shape}>
                  {shape}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">Allowed Payment Strategies</span>
          <div className="flex flex-wrap gap-3">
            {PAYMENT_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={payments.includes(option.value)}
                  onChange={() => togglePayment(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">Amenities</span>
          <div className="mb-2 flex flex-wrap gap-1">
            {AMENITY_PRESETS[vertical].map((preset) => (
              <button
                key={preset}
                onClick={() => toggleAmenity(preset)}
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  lines(amenities).includes(preset)
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            rows={3}
            placeholder="One amenity per line"
            className={inputClass}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Booking Policies (one per line)
          </span>
          <textarea
            value={policies}
            onChange={(e) => setPolicies(e.target.value)}
            rows={3}
            placeholder="Free cancellation up to 24 hours before check-in."
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Image Gallery (URLs)</span>
          <textarea
            value={images}
            onChange={(e) => setImages(e.target.value)}
            rows={2}
            placeholder="https://…"
            className={inputClass}
          />
        </label>
      </div>
    </Modal>
  );
}
