import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { addOnService, type AddOnDto, type AddOnTarget } from '@/services/addon.service';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#0A6C6D] focus:outline-none';

interface FormState {
  name: string;
  price: string;
  discountPrice: string;
  minOrderQuantity: string;
  appliesTo: AddOnTarget[];
}

const emptyForm: FormState = {
  name: '',
  price: '',
  discountPrice: '',
  minOrderQuantity: '1',
  appliesTo: ['dish', 'drink'],
};

export function AddOnsPage() {
  const [items, setItems] = useState<AddOnDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await addOnService.list());
    } catch {
      toast.error('Could not load add-ons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleTarget = (target: AddOnTarget) => {
    setForm((prev) => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(target)
        ? prev.appliesTo.filter((t) => t !== target)
        : [...prev.appliesTo, target],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price === '' || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        discountPrice: form.discountPrice === '' ? undefined : Number(form.discountPrice),
        minOrderQuantity: Number(form.minOrderQuantity) || 1,
        appliesTo: form.appliesTo.length ? form.appliesTo : (['dish', 'drink'] as AddOnTarget[]),
      };
      if (editingId) {
        await addOnService.update(editingId, payload);
        toast.success('Add-on updated');
      } else {
        await addOnService.create(payload);
        toast.success('Add-on created');
      }
      reset();
      await load();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save the add-on.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (addOn: AddOnDto) => {
    setEditingId(addOn._id);
    setForm({
      name: addOn.name,
      price: String(addOn.price),
      discountPrice: addOn.discountPrice != null ? String(addOn.discountPrice) : '',
      minOrderQuantity: String(addOn.minOrderQuantity ?? 1),
      appliesTo: addOn.appliesTo?.length ? addOn.appliesTo : ['dish', 'drink'],
    });
  };

  const remove = async (addOn: AddOnDto) => {
    try {
      await addOnService.remove(addOn._id);
      toast.success('Add-on removed');
      await load();
    } catch {
      toast.error('Could not remove the add-on.');
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Add-ons</h1>
        <p className="mt-1 text-sm text-gray-500">
          Extras guests can attach to dishes and drinks (e.g. sparklers, ice buckets, sides).
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-gray-500 md:col-span-2">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Sparkler Show"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Price (₦)
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Discount price (₦)
          <input
            type="number"
            min={0}
            value={form.discountPrice}
            onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Min order qty
          <input
            type="number"
            min={1}
            value={form.minOrderQuantity}
            onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })}
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-1 text-xs text-gray-500 md:col-span-2">
          Applies to
          <div className="flex gap-2">
            {(['dish', 'drink'] as AddOnTarget[]).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => toggleTarget(target)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                  form.appliesTo.includes(target)
                    ? 'border-[#0A6C6D] bg-[#0A6C6D]/5 text-[#0A6C6D]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {target}s
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || form.price === ''}
            className="w-full rounded-xl bg-[#0A6C6D] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A6C6D]/90 disabled:opacity-50"
          >
            {editingId ? 'Save' : 'Add add-on'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          No add-ons yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Applies to</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((addOn) => (
                <tr key={addOn._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{addOn.name}</td>
                  <td className="px-4 py-3 text-gray-700">₦{addOn.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs capitalize text-gray-500">
                    {(addOn.appliesTo ?? ['dish', 'drink']).join(' · ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(addOn)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-[#0A6C6D] hover:text-[#0A6C6D]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(addOn)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AddOnsPage;
