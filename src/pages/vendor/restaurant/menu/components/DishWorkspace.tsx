import { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronRight, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { dishService } from '@/services/dish.service';
import { menuCategoryService, type CategoryDto } from '@/services/menuCategory.service';
import { addOnService, type AddOnDto } from '@/services/addon.service';
import {
  EMPTY_DISH_FORM,
  deleteDishDraft,
  saveDishDraft,
  type DishFormState,
} from '../dishDrafts';

interface DishWorkspaceProps {
  mode: 'new' | 'edit';
  dishId?: string;
  /** Resume data (drafts). Only used in `new` mode. */
  initial?: DishFormState | null;
  draftId?: string | null;
  /** Draft storage scope. Omit to hide draft actions (e.g. staff hub). */
  vendorId?: string;
  enableDrafts?: boolean;
  onExit: () => void;
  onSaved: () => void;
  onDraftSaved?: () => void;
}

const MEAL_TIMES = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night', 'All Day'];
const QUICK_TAGS = ['Spicy', 'Popular', 'Savory'];

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

export function DishWorkspace({
  mode,
  dishId,
  initial,
  draftId,
  vendorId,
  enableDrafts = true,
  onExit,
  onSaved,
  onDraftSaved,
}: DishWorkspaceProps) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState<DishFormState>(initial ?? EMPTY_DISH_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddOnDto[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const draftsOn = enableDrafts && !isEdit && Boolean(vendorId);
  const title = isEdit ? (form.name ? `Edit ${form.name}` : 'Edit dish') : 'Create dish';
  const subtitle = isEdit
    ? 'Update the details guests see on the menu.'
    : 'Add a new dish guests can order.';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [categoryList, addonList] = await Promise.all([
          menuCategoryService.list(),
          addOnService.list({ appliesTo: 'dish' }),
        ]);
        if (!active) return;
        setCategories(categoryList);
        setAddonOptions(addonList);
        if (isEdit && dishId) {
          const dish = await dishService.get(dishId);
          if (!active) return;
          const categoryId =
            typeof dish.categoryId === 'object' && dish.categoryId
              ? String((dish.categoryId as { _id: string })._id)
              : String((dish.categoryId as string | undefined) ?? '');
          const knownTags = dish.tags ?? [];
          setCustomTags(knownTags.filter((t) => !QUICK_TAGS.includes(t)));
          setForm({
            name: dish.name ?? '',
            description: dish.description ?? '',
            categoryId,
            price: dish.price ?? 0,
            tags: knownTags,
            mealTimes: dish.mealTimes ?? [],
            discount: dish.discount ?? false,
            discountPrice: dish.discountPrice ?? 0,
            coverImage: dish.coverImage ?? dish.images?.[0] ?? '',
            addonIds: (dish.addonIds ?? []).map((entry: unknown) =>
              typeof entry === 'object' && entry
                ? String((entry as { _id: string })._id)
                : String(entry),
            ),
            isVisible: dish.isVisible ?? true,
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
  }, [isEdit, dishId]);

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const addCustomTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (!customTags.includes(tag)) setCustomTags((t) => [...t, tag]);
    setForm((prev) => (prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }));
    setNewTag('');
  };

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
      setForm((prev) => ({ ...prev, coverImage: response.data.secure_url }));
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
      const created = await menuCategoryService.create({ name });
      setCategories((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, categoryId: created._id }));
      setNewCategoryName('');
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

  const handleSaveDraft = () => {
    if (!vendorId) return;
    try {
      setSavingDraft(true);
      saveDishDraft(vendorId, form, draftId);
      onDraftSaved?.();
      toast.success(draftId ? 'Draft updated' : 'Draft saved — resume it anytime');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId || form.price <= 0) {
      toast.error('Name, category and a price above ₦0 are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description,
        price: form.price,
        categoryId: form.categoryId,
        mealTimes: form.mealTimes,
        tags: form.tags,
        coverImage: form.coverImage,
        images: form.coverImage ? [form.coverImage] : [],
        availability: form.isVisible,
        isVisible: form.isVisible,
        discount: form.discount,
        discountPrice: form.discount ? form.discountPrice : undefined,
        addonIds: form.addonIds,
      };
      if (isEdit && dishId) {
        await dishService.update(dishId, payload);
        toast.success('Dish updated');
      } else {
        await dishService.create(payload);
        toast.success('Dish created');
        if (draftId && vendorId) {
          deleteDishDraft(vendorId, draftId);
          onDraftSaved?.();
        }
      }
      onSaved();
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (isEdit ? 'Could not update dish.' : 'Could not create dish.'),
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
          Dishes
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-res-ink-muted" />
        <span aria-current="page" className="font-semibold text-res-ink">
          {isEdit ? 'Edit dish' : draftId ? 'Resume draft' : 'Create dish'}
        </span>
      </nav>

      <DashboardPageHeader title={title} subtitle={subtitle} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Basic information</h2>
            <div className="mt-3 space-y-4">
              <div>
                <label className={labelClass} htmlFor="dish-name">
                  Dish name <span className="text-red-600">*</span>
                </label>
                <input
                  id="dish-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Smoky Jollof Platter"
                  maxLength={50}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="dish-description">
                  Description <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  id="dish-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What makes this dish special?"
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Categorization</h2>
            <div className="mt-3 space-y-4">
              <div>
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
                        className={pillClass(form.categoryId === category._id)}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
                {showCategoryForm ? (
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      aria-label="New category name"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      className="type-res-small shrink-0 cursor-pointer rounded-full bg-res-brand px-4 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingCategory ? 'Creating…' : 'Create'}
                    </button>
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

              <div>
                <span className={labelClass}>Meal times</span>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TIMES.map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, mealTimes: toggleInList(form.mealTimes, meal) })
                      }
                      aria-pressed={form.mealTimes.includes(meal)}
                      className={pillClass(form.mealTimes.includes(meal))}
                    >
                      {meal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={labelClass}>Tags</span>
                <div className="flex flex-wrap gap-2">
                  {[...QUICK_TAGS, ...customTags].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setForm({ ...form, tags: toggleInList(form.tags, tag) })}
                      aria-pressed={form.tags.includes(tag)}
                      className={pillClass(form.tags.includes(tag))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex gap-2">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Add your own tag"
                    aria-label="Add your own tag"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="type-res-small shrink-0 cursor-pointer rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink transition-colors hover:text-res-brand"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Pricing</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <label className={labelClass} htmlFor="dish-price">
                  Price <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
                  <span className="type-res-body font-semibold text-res-ink">₦</span>
                  <input
                    id="dish-price"
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
                  <label className={labelClass} htmlFor="dish-discount-price">
                    Deal price
                  </label>
                  <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
                    <span className="type-res-body font-semibold text-res-ink">₦</span>
                    <input
                      id="dish-discount-price"
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
              htmlFor="dish-cover-image"
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
                id="dish-cover-image"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="sr-only"
                disabled={uploading}
              />
            </label>
            {form.coverImage && (
              <img
                src={form.coverImage}
                alt="Dish preview"
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
                    ? 'Guests can see and order this dish.'
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
        {draftsOn && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || saving}
            className="type-res-small cursor-pointer rounded-full bg-res-surface px-5 py-2.5 font-semibold text-res-ink transition-colors hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingDraft ? 'Saving…' : draftId ? 'Update draft' : 'Save as draft'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="type-res-small cursor-pointer rounded-full bg-res-brand px-6 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create dish'}
        </button>
      </div>
    </div>
  );
}

export default DishWorkspace;
