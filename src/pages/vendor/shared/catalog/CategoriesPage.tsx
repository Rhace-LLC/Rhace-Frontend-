import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Modal } from '@/components/others/RhaceModal';
import { menuCategoryService, type CategoryDto } from '@/services/menuCategory.service';
import { drinkCategoryService } from '@/services/drinkCategory.service';

type Kind = 'menu' | 'drink' | 'service';

const serviceFor = (kind: Kind) =>
  kind === 'drink' ? drinkCategoryService : menuCategoryService;

const COPY: Record<Kind, { title: string; singular: string }> = {
  menu: { title: 'Menu categories', singular: 'category' },
  drink: { title: 'Drink categories', singular: 'category' },
  service: { title: 'Service categories', singular: 'category' },
};

export function CategoriesPage({ kind }: { kind: Kind }) {
  const service = serviceFor(kind);
  const [items, setItems] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      // Phase 2: service categories live in menu-categories with kind=service.
      if (kind === 'service') {
        setItems(await menuCategoryService.list(true, 'service'));
      } else {
        setItems(await service.list(true));
      }
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
    setDescription('');
    setOrder('0');
  };

  const openCreate = () => {
    reset();
    setModalOpen(true);
  };

  const openEdit = (category: CategoryDto) => {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setOrder(String(category.order ?? 0));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    reset();
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await service.update(editing._id, {
          name: name.trim(),
          description: description.trim(),
          order: Number(order) || 0,
        });
        toast.success('Category updated');
      } else {
        await service.create({
          name: name.trim(),
          description: description.trim(),
          order: Number(order) || 0,
          ...(kind === 'service' ? { kind: 'service' as const } : {}),
        });
        toast.success('Category created');
      }
      setModalOpen(false);
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
      <DashboardPageHeader
        title={COPY[kind].title}
        subtitle="Group your items so guests can browse them easily."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
          >
            {`Add ${COPY[kind].singular}`}
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
          No categories yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th
                    className="px-4 py-3 font-medium"
                    title="Display position — lower numbers appear first on the guest menu"
                  >
                    Sort order
                  </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((category) => (
                <tr key={category._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{category.name}</p>
                    {category.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs font-normal text-gray-500">
                        {category.description}
                      </p>
                    )}
                  </td>
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
                          onClick={() => openEdit(category)}
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

      {modalOpen && (
        <Modal
          isOpen
          onClose={closeModal}
          title={editing ? `Edit ${COPY[kind].singular}` : `Add ${COPY[kind].singular}`}
          subtitle={
            kind === 'drink'
              ? 'Group drinks so guests can browse them easily.'
              : 'Group dishes so guests can browse them easily.'
          }
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
                disabled={saving || !name.trim()}
                className="type-res-small cursor-pointer rounded-full bg-res-brand px-5 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : `Add ${COPY[kind].singular}`}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label
                className="type-res-small mb-1.5 block font-medium text-res-ink-muted"
                htmlFor="category-name"
              >
                Name
              </label>
              <input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${kind === 'drink' ? 'Cocktails' : 'Starters'}`}
                className="type-res-body w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand"
              />
            </div>
            <div>
              <label
                className="type-res-small mb-1.5 block font-medium text-res-ink-muted"
                htmlFor="category-description"
              >
                Description
              </label>
              <input
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`e.g. ${kind === 'drink' ? 'Signature pours to start the night' : 'Small plates to start the meal'}`}
                className="type-res-body w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand"
              />
            </div>
            <div>
              <label
                className="type-res-small mb-1.5 block font-medium text-res-ink-muted"
                htmlFor="category-order"
              >
                Sort order
              </label>
              <input
                id="category-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="type-res-body w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand"
              />
              <p className="type-res-small mt-1.5 font-normal text-res-ink-muted">
                Display position — lower numbers appear first on the guest menu.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CategoriesPage;
