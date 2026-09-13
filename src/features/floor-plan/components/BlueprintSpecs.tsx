import type { InventoryBlueprint, PaymentStrategy } from '../domain/types';

const PAYMENT_LABEL: Record<PaymentStrategy, string> = {
  full_prepayment: 'Full prepayment',
  deposit_50_percent: '50% deposit',
  pay_at_venue: 'Pay at venue',
  hold_card_authorization: 'Card hold',
};

export function BlueprintSpecs({ blueprint }: { blueprint?: InventoryBlueprint }) {
  if (!blueprint) return null;
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">{blueprint.type}</span>
        <span className="font-semibold text-gray-900">
          ${blueprint.basePrice.toLocaleString()}
          {blueprint.vertical === 'restaurant' && blueprint.basePrice === 0 ? ' (free)' : ''}
        </span>
      </div>
      {blueprint.description && <p className="text-gray-500">{blueprint.description}</p>}

      <div>
        <p className="mb-1 font-medium text-gray-600">Payment</p>
        <div className="flex flex-wrap gap-1">
          {blueprint.allowedPaymentStrategies.map((strategy) => (
            <span key={strategy} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              {PAYMENT_LABEL[strategy] ?? strategy}
            </span>
          ))}
        </div>
      </div>

      {blueprint.amenities.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-gray-600">Amenities</p>
          <div className="flex flex-wrap gap-1">
            {blueprint.amenities.map((amenity) => (
              <span key={amenity.id} className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">
                {amenity.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {blueprint.bookingPolicies.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-gray-600">Policies</p>
          <ul className="space-y-0.5 text-gray-500">
            {blueprint.bookingPolicies.map((policy) => (
              <li key={policy.id}>· {policy.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
