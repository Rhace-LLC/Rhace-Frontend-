import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { menuCategoryService, type CategoryDto } from '@/services/menuCategory.service';
import { drinkCategoryService } from '@/services/drinkCategory.service';

type Kind = 'menu' | 'drink';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#0A6C6D] focus:outline-none';

const serviceFor = (kind: Kind) =>
  kind === 'menu' ? menuCategoryService : drinkCategoryService;

const COPY: Record<Kind, { title: string; singular: string }> = {
  menu: { title: 'Menu categories', singular: 'category' },
  drink: { title: 'Drink categories', singular: 'category' },
};

export function CategoriesPage({ kind }: { kind: Kind }) {
  const service = serviceFor(kind);
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await service.list(true));
    } catch {
      toast.error('Could not load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const reset = () => {
    setEditing(null);
    setName('');
    setOrder('0');
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await service.update(editing._id, { name: name.trim(), order: Number(order) || 0 });
        toast.success('Category updated');
      } else {
        await service.create({ name: name.trim(), order: Number(order) || 0 });
        toast.success('Category created');
      }
      reset();
      await load();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save the category.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: CategoryDto) => {
    setEditing(category);
    setName(category.name);
    setOrder(String(category.order ?? 0));
  };

  const toggleActive = async (category: CategoryDto) => {
    try {
      await service.update(category._id, { isActive: !category.isActive });
      await load();
    } catch {
      toast.error('Could not update the category.');
    }
  };

  const remove = async (category: CategoryDto) => {
    try {
      await service.remove(category._id);
      toast.success('Category removed');
      await load();
    } catch {
      toast.error('Could not remove the category.');
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{COPY[kind].title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Group your items so guests can browse them easily.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. ${kind === 'drink' ? 'Cocktails' : 'Starters'}`}
            className={inputClass}
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-xs text-gray-500">
          Order
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="rounded-xl bg-[#0A6C6D] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A6C6D]/90 disabled:opacity-50"
        >
          {editing ? 'Save changes' : `Add ${COPY[kind].singular}`}
        </button>
        {editing && (
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
          No categories yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((category) => (
                <tr key={category._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-gray-600">{category.order ?? 0}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(category)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        category.isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-[#0A6C6D] hover:text-[#0A6C6D]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(category)}
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

export default CategoriesPage;
