import { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronRight, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { clubService } from '@/services/club.service';
import { drinkCategoryService } from '@/services/drinkCategory.service';
import { addOnService, type AddOnDto } from '@/services/addon.service';
import type { CategoryDto } from '@/services/menuCategory.service';

interface DrinkWorkspaceProps {
  mode: 'new' | 'edit';
  drinkId?: string;
  onExit: () => void;
  onSaved: () => void;
}

interface DrinkFormState {
  name: string;
  description: string;
  categoryId: string;
  volume: string;
  price: number;
  discount: boolean;
  discountPrice: number;
  images: string[];
  addonIds: string[];
  isVisible: boolean;
}

const EMPTY_FORM: DrinkFormState = {
  name: '',
  description: '',
  categoryId: '',
  volume: '',
  price: 0,
  discount: false,
  discountPrice: 0,
  images: [],
  addonIds: [],
  isVisible: true,
};

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';
const sectionClass = 'rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5';
const sectionTitleClass = 'type-res-h3 text-res-ink';

const pillClass = (active: boolean) =>
  `type-res-small cursor-pointer rounded-full px-3.5 py-2 font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
    active
      ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
      : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
  }`;

export function DrinkWorkspace({ mode, drinkId, onExit, onSaved }: DrinkWorkspaceProps) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState<DrinkFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddOnDto[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const title = isEdit
    ? form.name
      ? `Edit ${form.name}`
      : 'Edit drink'
    : 'Create drink';
  const subtitle = isEdit
    ? 'Update the details guests see on the menu.'
    : 'Add a new drink guests can order.';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [categoryList, addonList] = await Promise.all([
          drinkCategoryService.list(),
          addOnService.list({ appliesTo: 'drink' }),
        ]);
        if (!active) return;
        setCategories(categoryList);
        setAddonOptions(addonList);
        if (isEdit && drinkId) {
          const drink = await clubService.getDrink(drinkId);
          if (!active) return;
          const categoryId =
            typeof drink.categoryId === 'object' && drink.categoryId
              ? String((drink.categoryId as { _id: string })._id)
              : String((drink.categoryId as string | undefined) ?? '');
          setForm({
            name: String(drink.name ?? ''),
            description: String(drink.description ?? ''),
            categoryId,
            volume: String(drink.volume ?? ''),
            price: Number(drink.price ?? 0),
            discount: Boolean(
              drink.discountPrice && drink.price && drink.discountPrice < drink.price,
            ),
            discountPrice: Number(drink.discountPrice ?? 0),
            images: Array.isArray(drink.images) ? drink.images : drink.image ? [drink.image] : [],
            addonIds: (drink.addonIds ?? drink.addOns ?? []).map((entry: unknown) =>
              typeof entry === 'object' && entry
                ? String((entry as { _id: string })._id)
                : String(entry),
            ),
            isVisible: drink.status ? drink.status !== 'hidden' : true,
          });
        }
      } catch {
        toast.error('Could not load categories and add-ons.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isEdit, drinkId]);

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const handleImageUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 5242880) {
      toast.error('Image must be under 5MB.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData,
      );
      setForm((prev) => ({ ...prev, images: [response.data.secure_url] }));
    } catch {
      toast.error('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Give the category a name first.');
      return;
    }
    try {
      setCreatingCategory(true);
      const created = await drinkCategoryService.create({
        name,
        description: newCategoryDescription.trim(),
      });
      setCategories((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, categoryId: created._id }));
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowCategoryForm(false);
      toast.success(`Category “${created.name}” created`);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not create category.',
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId || form.price <= 0) {
      toast.error('Name, category and a price above ₦0 are required.');
      return;
    }
    try {
      setSaving(true);
      const selected = categories.find((c) => c._id === form.categoryId);
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: selected?.name ?? '',
        categoryId: form.categoryId,
        volume: form.volume.trim() || null,
        price: form.price,
        discountPrice: form.discount ? form.discountPrice : undefined,
        images: form.images,
        status: form.isVisible ? 'Active' : 'hidden',
        addonIds: form.addonIds,
        addOns: form.addonIds,
      };
      if (isEdit && drinkId) {
        await clubService.updateDrinkType(drinkId, payload);
        toast.success('Drink updated');
      } else {
        await clubService.createDrinkType({ ...payload, quantity: 0 });
        toast.success('Drink created');
      }
      onSaved();
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (isEdit ? 'Could not update drink.' : 'Could not create drink.'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 animate-pulse rounded-full bg-res-surface" />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-res-lg bg-res-card" />
          <div className="h-96 animate-pulse rounded-res-lg bg-res-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="type-res-small flex items-center gap-1 font-medium">
        <button
          type="button"
          onClick={onExit}
          className="cursor-pointer font-normal text-res-ink-muted transition-colors hover:text-res-brand"
        >
          Drinks
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-res-ink-muted" />
        <span aria-current="page" className="font-semibold text-res-ink">
          {isEdit ? 'Edit drink' : 'Create drink'}
        </span>
      </nav>

      <DashboardPageHeader title={title} subtitle={subtitle} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Basic information</h2>
            <div className="mt-3 space-y-4">
              <div>
                <label className={labelClass} htmlFor="drink-name">
                  Drink name <span className="text-red-600">*</span>
                </label>
                <input
                  id="drink-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chapman"
                  maxLength={50}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="drink-description">
                  Description <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  id="drink-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What makes this drink special?"
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="drink-volume">
                  Volume <span className="font-normal">(optional)</span>
                </label>
                <input
                  id="drink-volume"
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder="e.g. 75cl"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Categorization</h2>
            <div className="mt-3">
              <span className={labelClass}>
                Category <span className="text-red-600">*</span>
              </span>
              {categories.length === 0 && !showCategoryForm ? (
                <div className="rounded-res-md bg-res-surface px-4 py-3">
                  <p className="type-res-small font-normal text-res-ink-muted">
                    No categories yet — create the first one below.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => setForm({ ...form, categoryId: category._id })}
                      aria-pressed={form.categoryId === category._id}
                      title={category.description || category.name}
                      className={pillClass(form.categoryId === category._id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
              {showCategoryForm ? (
                <div className="mt-2.5 space-y-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    aria-label="New category name"
                    className={inputClass}
                  />
                  <input
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Short description (optional)"
                    aria-label="New category description"
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      className="type-res-small shrink-0 cursor-pointer rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingCategory ? 'Creating…' : 'Create category'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(false)}
                      className="type-res-small cursor-pointer rounded-full px-4 py-2.5 font-semibold text-res-ink-muted hover:text-res-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(true)}
                  className="type-res-small mt-2.5 inline-flex cursor-pointer items-center gap-1 font-semibold text-res-brand hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> New category
                </button>
              )}
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Pricing</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <label className={labelClass} htmlFor="drink-price">
                  Price <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
                  <span className="type-res-body font-semibold text-res-ink">₦</span>
                  <input
                    id="drink-price"
                    type="number"
                    min="0"
                    value={form.price || ''}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="0"
                    className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
                  />
                </div>
              </div>
              <label className="type-res-small flex cursor-pointer items-center gap-2 font-semibold text-res-ink">
                <input
                  type="checkbox"
                  checked={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.checked })}
                  className="h-4 w-4 accent-[#0A6C6D]"
                />
                Deal price
              </label>
              {form.discount && (
                <div className="min-w-[160px] flex-1">
                  <label className={labelClass} htmlFor="drink-discount-price">
                    Deal price
                  </label>
                  <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
                    <span className="type-res-body font-semibold text-res-ink">₦</span>
                    <input
                      id="drink-discount-price"
                      type="number"
                      min="0"
                      value={form.discountPrice || ''}
                      onChange={(e) =>
                        setForm({ ...form, discountPrice: Number(e.target.value) })
                      }
                      placeholder="0"
                      className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Photo</h2>
            <label
              htmlFor="drink-cover-image"
              className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-res-md border border-dashed border-res-line bg-res-surface p-6 text-center transition-colors hover:border-res-brand"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-res-brand" />
              ) : (
                <Upload className="h-6 w-6 text-res-ink-muted" />
              )}
              <p className="type-res-small mt-2 font-semibold text-res-ink">
                {uploading ? 'Uploading…' : 'Drop a photo here, or browse files'}
              </p>
              <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
                JPG or PNG · max 5MB
              </p>
              <input
                type="file"
                id="drink-cover-image"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="sr-only"
                disabled={uploading}
              />
            </label>
            {form.images[0] && (
              <img
                src={form.images[0]}
                alt="Drink preview"
                className="mt-3 h-40 w-full rounded-res-md object-cover"
              />
            )}
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Add-ons</h2>
            {addonOptions.length === 0 ? (
              <p className="type-res-small mt-2 font-normal text-res-ink-muted">
                No add-ons yet. Create them under Add-ons.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {addonOptions.map((addOn) => {
                  const active = form.addonIds.includes(addOn._id);
                  return (
                    <button
                      key={addOn._id}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, addonIds: toggleInList(form.addonIds, addOn._id) })
                      }
                      aria-pressed={active}
                      className={pillClass(active)}
                    >
                      {addOn.name} · ₦{addOn.price.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Availability</h2>
            <button
              type="button"
              role="switch"
              aria-checked={form.isVisible}
              onClick={() => setForm({ ...form, isVisible: !form.isVisible })}
              className="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="type-res-body block font-semibold text-res-ink">
                  Available for ordering
                </span>
                <span className="type-res-small block font-normal text-res-ink-muted">
                  {form.isVisible
                    ? 'Guests can see and order this drink.'
                    : 'Hidden from the menu until you put it back on.'}
                </span>
              </span>
              <span
                aria-hidden
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  form.isVisible ? 'bg-res-brand' : 'bg-res-brand-disabled'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    form.isVisible ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 rounded-res-lg border border-res-line bg-res-card p-4 shadow-res-medium sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onExit}
          className="type-res-small cursor-pointer rounded-full px-5 py-2.5 font-semibold text-res-ink-muted transition-colors hover:text-res-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="type-res-small cursor-pointer rounded-full bg-res-brand px-6 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create drink'}
        </button>
      </div>
    </div>
  );
}

export default DrinkWorkspace;
