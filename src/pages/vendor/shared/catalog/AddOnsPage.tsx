import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Modal } from '@/components/others/RhaceModal';
import { addOnService, type AddOnDto, type AddOnTarget } from '@/services/addon.service';

const fieldInputClass =
  'type-res-body w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const fieldLabelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';

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
  const [modalOpen, setModalOpen] = useState(false);
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

  const openCreate = () => {
    reset();
    setModalOpen(true);
  };

  const openEdit = (addOn: AddOnDto) => {
    setEditingId(addOn._id);
    setForm({
      name: addOn.name,
      price: String(addOn.price),
      discountPrice: addOn.discountPrice != null ? String(addOn.discountPrice) : '',
      minOrderQuantity: String(addOn.minOrderQuantity ?? 1),
      appliesTo: addOn.appliesTo?.length ? addOn.appliesTo : ['dish', 'drink'],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    reset();
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
      setModalOpen(false);
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
      <DashboardPageHeader
        title="Add-ons"
        subtitle="Extras guests can attach to dishes and drinks (e.g. sparklers, ice buckets, sides)."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
          >
            Add add-on
          </button>
        }
      />

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
                          onClick={() => openEdit(addOn)}
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

      {modalOpen && (
        <Modal
          isOpen
          onClose={closeModal}
          title={editingId ? 'Edit add-on' : 'Add add-on'}
          subtitle="Extras guests can attach to dishes and drinks."
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim() || form.price === ''}
                className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add add-on'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={fieldLabelClass} htmlFor="addon-name">
                Name
              </label>
              <input
                id="addon-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sparkler Show"
                className={fieldInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelClass} htmlFor="addon-price">
                  Price (₦)
                </label>
                <input
                  id="addon-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="addon-discount-price">
                  Discount price (₦)
                </label>
                <input
                  id="addon-discount-price"
                  type="number"
                  min={0}
                  value={form.discountPrice}
                  onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="addon-min-qty">
                Min order qty
              </label>
              <input
                id="addon-min-qty"
                type="number"
                min={1}
                value={form.minOrderQuantity}
                onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div>
              <span className={fieldLabelClass}>Applies to</span>
              <div className="flex gap-2">
                {(['dish', 'drink'] as AddOnTarget[]).map((target) => {
                  const active = form.appliesTo.includes(target);
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => toggleTarget(target)}
                      aria-pressed={active}
                      className={`type-res-small cursor-pointer rounded-full px-4 py-2 font-semibold capitalize transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                        active
                          ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                          : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                      }`}
                    >
                      {target}s
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AddOnsPage;
