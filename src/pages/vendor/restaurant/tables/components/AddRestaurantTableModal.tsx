import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { restaurantTableService } from '@/services/restaurantTable.service';

interface RestaurantTableFormData {
  name: string;
  description: string;
  seatingCapacity: string | number;
  quantityAvailable: string | number;
  minSpend: string | number;
  category: string;
  _id?: string;
}

interface AddRestaurantTableModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: RestaurantTableFormData;
  editMode?: boolean;
  restaurantId?: string;
}

const RESTAURANT_TABLE_CATEGORIES = ['Indoor', 'Outdoor', 'Bar', 'Private', 'Booth'];

export function AddRestaurantTableModal({
  onClose,
  onSuccess,
  initialData = {
    name: '',
    description: '',
    seatingCapacity: 2,
    quantityAvailable: 1,
    minSpend: 0,
    category: 'Indoor',
  },
  editMode = false,
  restaurantId,
}: AddRestaurantTableModalProps) {
  const [formData, setFormData] = useState<RestaurantTableFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        seatingCapacity: parseInt(String(formData.seatingCapacity)) || 1,
        quantityAvailable: parseInt(String(formData.quantityAvailable)) || 1,
        minSpend: parseFloat(String(formData.minSpend)) || 0,
        category: formData.category,
      };
      if (restaurantId) payload.restaurantId = restaurantId;

      if (editMode) {
        payload.tableId = initialData._id;
        await restaurantTableService.updateTable(payload);
      } else {
        await restaurantTableService.createTable(payload);
      }
      onSuccess();
    } catch (err) {
      const e2 = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      if (e2.response?.status === 403) {
        setError('You do not have permission to manage tables. Please contact your administrator.');
      } else if (e2.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (e2.response?.data?.message) {
        setError(e2.response.data.message);
      } else {
        setError('Failed to save table. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editMode ? 'Edit Table' : 'Add New Table'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Window Table 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              required
              placeholder="e.g. A quiet table by the window, good for couples"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seating Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              placeholder="2"
              value={formData.seatingCapacity}
              onChange={(e) => setFormData({ ...formData, seatingCapacity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              placeholder="1"
              value={formData.quantityAvailable}
              onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Spend
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₦
              </span>
              <input
                type="number"
                placeholder="0"
                value={formData.minSpend}
                onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              required
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {RESTAURANT_TABLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
