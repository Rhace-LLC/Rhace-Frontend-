import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Modal } from '@/components/others/RhaceModal';
import { menuCategoryService, type CategoryDto } from '@/services/menuCategory.service';
import {
  hotelServiceApi,
  type HotelServiceInput,
  type HotelServiceItemDto,
  type ServiceKind,
  type ServiceRoute,
} from '@/services/hotelService.service';

const ROUTES: ServiceRoute[] = ['housekeeping', 'front_desk', 'concierge', 'spa', 'maintenance'];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900';
const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

/** Phase 2 hotel vendor page: amenities + experiences CRUD. */
export default function HotelServicesPage() {
  const [kind, setKind] = useState<ServiceKind>('amenity');
  const [items, setItems] = useState<HotelServiceItemDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HotelServiceItemDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HotelServiceInput>({
    kind: 'amenity',
    name: '',
    description: '',
    price: 0,
    categoryId: null,
    routeTo: 'housekeeping',
    maxPerOrder: 10,
    active: true,
    experience: null,
  });

  const load = async () => {
    try {
      setLoading(true);
      const [serviceItems, cats] = await Promise.all([
        hotelServiceApi.list(kind),
        menuCategoryService.list(true, 'service'),
      ]);
      setItems(serviceItems);
      setCategories(cats);
    } catch {
      toast.error('Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      kind,
      name: '',
      description: '',
      price: 0,
      categoryId: null,
      routeTo: kind === 'amenity' ? 'housekeeping' : 'spa',
      maxPerOrder: 10,
      active: true,
      experience:
        kind === 'experience'
          ? { durationMins: 60, capacityPerSlot: 1, slotIntervalMins: 60, leadTimeMins: 60 }
          : null,
    });
    setModalOpen(true);
  };

  const openEdit = (item: HotelServiceItemDto) => {
    setEditing(item);
    setForm({
      kind: item.kind,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      categoryId: item.categoryId ?? null,
      routeTo: item.routeTo,
      maxPerOrder: item.maxPerOrder,
      trackStock: item.trackStock,
      stock: item.stock,
      active: item.active,
      experience: item.experience
        ? {
            durationMins: item.experience.durationMins,
            capacityPerSlot: item.experience.capacityPerSlot,
            slotIntervalMins: item.experience.slotIntervalMins,
            leadTimeMins: item.experience.leadTimeMins,
            dayStart: item.experience.dayStart,
            dayEnd: item.experience.dayEnd,
          }
        : null,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) await hotelServiceApi.update(editing._id, form);
      else await hotelServiceApi.create({ ...form, kind });
      toast.success(editing ? 'Service updated' : 'Service created');
      setModalOpen(false);
      await load();
    } catch {
      toast.error('Could not save the service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: HotelServiceItemDto) => {
    try {
      await hotelServiceApi.update(item._id, { active: !item.active });
      await load();
    } catch {
      toast.error('Could not update the service.');
    }
  };

  const remove = async (item: HotelServiceItemDto) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await hotelServiceApi.remove(item._id);
      toast.success('Service deleted');
      await load();
    } catch {
      toast.error('Could not delete the service.');
    }
  };

  const set = <K extends keyof HotelServiceInput>(key: K, value: HotelServiceInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <DashboardPageHeader
        title={kind === 'amenity' ? 'Amenities' : 'Experiences'}
        subtitle={
          kind === 'amenity'
            ? 'Housekeeping requests fulfilled by your team.'
            : 'Bookable services with slot capacity (spa, transfers, cabanas).'
        }
        actions={
          <div className="flex gap-2">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
              {(['amenity', 'experience'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
                    kind === k ? 'bg-white shadow' : 'text-slate-500'
                  }`}
                >
                  {k === 'amenity' ? 'Amenities' : 'Experiences'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Add {kind === 'amenity' ? 'amenity' : 'experience'}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          No {kind === 'amenity' ? 'amenities' : 'experiences'} yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Routes to</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.kind === 'experience' && item.experience
                        ? `${item.experience.durationMins} min · ${item.experience.capacityPerSlot}/slot`
                        : `max ${item.maxPerOrder}/order`}
                    </p>
                  </td>
                  <td className="px-4 py-3">{item.price}</td>
                  <td className="px-4 py-3 capitalize">{item.routeTo.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="mr-2 text-xs font-semibold text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => !saving && setModalOpen(false)}>
        <div className="max-h-[80vh] space-y-3 overflow-y-auto p-1">
          <h3 className="text-lg font-semibold">
            {editing ? 'Edit' : 'New'} {kind === 'amenity' ? 'amenity' : 'experience'}
          </h3>
          <div>
            <label className={labelClass}>Name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className={inputClass}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Price</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set('price', Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={form.categoryId ?? ''}
                onChange={(e) => set('categoryId', e.target.value || null)}
                className={inputClass}
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Routes to</label>
              <select
                value={form.routeTo}
                onChange={(e) => set('routeTo', e.target.value as ServiceRoute)}
                className={inputClass}
              >
                {ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Max per order</label>
              <input
                type="number"
                min={1}
                value={form.maxPerOrder ?? 10}
                onChange={(e) => set('maxPerOrder', Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          {form.kind === 'experience' && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <label className={labelClass}>Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  value={form.experience?.durationMins ?? 60}
                  onChange={(e) =>
                    set('experience', { ...form.experience!, durationMins: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Capacity / slot</label>
                <input
                  type="number"
                  min={1}
                  value={form.experience?.capacityPerSlot ?? 1}
                  onChange={(e) =>
                    set('experience', { ...form.experience!, capacityPerSlot: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Slot interval (min)</label>
                <input
                  type="number"
                  min={5}
                  value={form.experience?.slotIntervalMins ?? 60}
                  onChange={(e) =>
                    set('experience', {
                      ...form.experience!,
                      slotIntervalMins: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Lead time (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.experience?.leadTimeMins ?? 60}
                  onChange={(e) =>
                    set('experience', { ...form.experience!, leadTimeMins: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="w-full rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
