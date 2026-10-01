import { useEffect, useMemo, useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import { Add, ArrowsRight, Export } from '@/components/dashboard/ui/svg';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Pencil, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { menuService } from '@/services/menu.service';
import { stockService } from '@/services/stock.service';
import { toast } from 'react-toastify';
import { Modal } from '@/components/others/RhaceModal';
import UniversalLoader from '@/components/user/ui/LogoLoader';

const PAGE_SIZE = 12;

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type SortKey = 'newest' | 'name' | 'price-asc' | 'price-desc';

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All availability' },
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

const selectClass =
  'rounded-res-sm border border-res-line bg-res-card px-3 py-2.5 type-res-body font-normal text-res-ink shadow-res-low outline-none focus:border-res-brand';

const money = (value: unknown) => `₦${Number(value ?? 0).toLocaleString()}`;

interface DishItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discount?: boolean;
  discountPrice?: number;
  coverImage?: string;
  images?: string[];
  category?: string;
  categoryId?: { _id: string; name: string } | string | null;
  menuType?: string[];
  mealTimes?: string[];
  tags?: string[];
  status?: string;
  availability?: boolean;
  addOns?: boolean;
  addonIds?: unknown[];
}

const categoryName = (item: DishItem): string => {
  const fromRef =
    typeof item.categoryId === 'object' && item.categoryId !== null
      ? (item.categoryId.name ?? '')
      : '';
  return item.category || fromRef || 'Uncategorized';
};

const isAvailable = (item: DishItem): boolean => item.availability !== false;

const isDeal = (item: DishItem): boolean =>
  Boolean(item.discount && item.discountPrice && item.discountPrice < item.price);

const sellPrice = (item: DishItem): number =>
  isDeal(item) ? (item.discountPrice as number) : (item.price ?? 0);

const MenuDashboard = ({
  onCreateItem,
  onEditItem,
  vendorId: vendorIdProp,
}: {
  /** Embedded use (e.g. manager hub): intercept vendor-shell navigation. */
  onCreateItem?: () => void;
  onEditItem?: (id: string) => void;
  /** Staff logins carry no vendor session — pass the venue id explicitly. */
  vendorId?: string;
} = {}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [menuItems, setMenuItems] = useState<DishItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<DishItem | null>(null);
  const navigate = useNavigate();
  const { vendor } = useAuth();
  const vendorId = vendorIdProp ?? vendor?._id;

  const resetPage = () => setPage(1);

  useEffect(() => {
    async function fetchMenuItems() {
      try {
        setIsLoading(true);
        if (!vendorId) return;
        const items = await menuService.getMenuItems(vendorId);
        setMenuItems(items.menuItems ?? []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch dishes');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMenuItems();
  }, [vendorId]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of menuItems) {
      const key = categoryName(item).toLowerCase();
      if (!seen.has(key)) seen.set(key, categoryName(item));
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = menuItems.filter((item) => {
      if (category !== 'all' && categoryName(item).toLowerCase() !== category) return false;
      if (availability === 'available' && !isAvailable(item)) return false;
      if (availability === 'unavailable' && isAvailable(item)) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term)
      );
    });
    const sorted = [...list];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        sorted.sort((a, b) => sellPrice(a) - sellPrice(b));
        break;
      case 'price-desc':
        sorted.sort((a, b) => sellPrice(b) - sellPrice(a));
        break;
      case 'newest':
      default:
        break;
    }
    return sorted;
  }, [menuItems, query, category, availability, sort]);

  const hasFilters =
    query.trim() !== '' || category !== 'all' || availability !== 'all' || sort !== 'newest';

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setAvailability('all');
    setSort('newest');
    resetPage();
  };

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleAvailability = async (item: DishItem) => {
    try {
      setBusyId(item._id);
      await stockService.setAvailability('dish', item._id, !isAvailable(item));
      setMenuItems((prev) =>
        prev.map((entry) =>
          entry._id === item._id ? { ...entry, availability: !isAvailable(item) } : entry,
        ),
      );
      toast.success(
        isAvailable(item) ? `${item.name} marked unavailable` : `${item.name} is available again`,
      );
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update availability',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    try {
      await menuService.deleteMenu(id, 'item');
      toast.success('Dish deleted');
      setMenuItems((prev) => prev.filter((item) => item._id !== id));
      setDetails(null);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete dish.');
    }
  };

  const editDish = (id: string) => {
    if (onEditItem) onEditItem(id);
    else navigate(`/dashboard/restaurant/menu/items/${id}/edit`);
  };

  if (isLoading) {
    return <UniversalLoader fullscreen type="dashboard-3" />;
  }

  return (
    <>
      <div className="mb-12 space-y-6 md:p-6">
        <DashboardPageHeader
          title="Dishes"
          subtitle="Create, price and organize the dishes guests can order."
          actions={
            <>
              <DashboardButton variant="secondary" text="Export" icon={<Export />} />
              <DashboardButton
                onClick={() =>
                  onCreateItem ? onCreateItem() : navigate('/dashboard/restaurant/menu/item/new')
                }
                variant="primary"
                text="Add Dish"
                icon={<Add fill="#fff" />}
              />
            </>
          }
        />

        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-res-surface px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPage();
                }}
                placeholder="Search dishes…"
                aria-label="Search dishes"
                className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
              />
            </label>
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                resetPage();
              }}
              className={selectClass}
            >
              <option value="all">All categories</option>
              {categories.map((name) => (
                <option key={name.toLowerCase()} value={name.toLowerCase()}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by availability"
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value as AvailabilityFilter);
                resetPage();
              }}
              className={selectClass}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort dishes"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={selectClass}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2.5 font-semibold text-res-ink-muted transition-colors outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="mt-4">
            {filtered.length === 0 ? (
              <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
                <p className="type-res-h3 text-res-ink">
                  {menuItems.length === 0 ? 'No dishes yet' : 'No dishes match'}
                </p>
                <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                  {menuItems.length === 0
                    ? 'Add your first dish and it will show up here.'
                    : 'Try adjusting the search or filters.'}
                </p>
              </div>
            ) : (
              <>
                <p className="type-res-small mb-3 font-normal text-res-ink-muted">
                  {filtered.length} dish{filtered.length === 1 ? '' : 'es'}
                  {hasFilters ? ' match these filters' : ' on the menu'}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((item) => {
                    const available = isAvailable(item);
                    const deal = isDeal(item);
                    const image = item.images?.[0] || item.coverImage;
                    const tags = item.tags ?? [];
                    const addonCount = item.addonIds?.length ?? 0;
                    const busy = busyId === item._id;
                    return (
                      <article
                        key={item._id}
                        className="flex w-full flex-col overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-low"
                      >
                        <div className="relative h-44 shrink-0 bg-res-surface">
                          {image ? (
                            <img
                              src={image}
                              alt={item.name}
                              loading="lazy"
                              className={`h-full w-full object-cover transition-transform duration-200 hover:scale-105 ${
                                available ? '' : 'opacity-60 grayscale'
                              }`}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="type-res-small font-medium text-res-ink-muted">
                                No photo
                              </span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleAvailability(item)}
                              title={
                                available
                                  ? 'Pull off the menu (unavailable)'
                                  : 'Put back on the menu'
                              }
                              className={`type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-60 ${
                                available
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  available ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              {busy ? 'Saving…' : available ? 'Available' : 'Unavailable'}
                            </button>
                            {deal && (
                              <span className="type-res-small inline-flex items-center rounded-full bg-res-brand px-2.5 py-1 font-semibold whitespace-nowrap text-res-ink-inverted">
                                Deal
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                            {categoryName(item)}
                            {(item.mealTimes ?? []).length > 0
                              ? ` · ${item.mealTimes!.slice(0, 2).join(' · ')}`
                              : ''}
                          </p>
                          <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                              {item.description}
                            </p>
                          )}
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="type-res-small rounded-full bg-res-surface px-2 py-0.5 font-medium text-res-ink-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className="type-res-small px-1 py-0.5 font-semibold text-res-ink-muted">
                                  +{tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
                            <p className="type-res-h3 text-res-ink">{money(sellPrice(item))}</p>
                            {deal && (
                              <p className="type-res-small font-medium text-res-ink-muted line-through">
                                {money(item.price)}
                              </p>
                            )}
                            <span className="type-res-small ml-auto font-normal whitespace-nowrap text-res-ink-muted">
                              {item.status === 'inactive' ? 'Inactive' : 'Active'}
                              {addonCount > 0
                                ? ` · ${addonCount} add-on${addonCount === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetails(item)}
                              className="type-res-small flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                            >
                              View details <ArrowsRight />
                            </button>
                            <button
                              type="button"
                              onClick={() => editDish(item._id)}
                              className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="type-res-small font-normal text-res-ink-muted">
                    Page {safePage} of {pages} · {filtered.length} total
                  </span>
                  {pages > 1 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                        className="cursor-pointer rounded-full bg-res-surface p-2.5 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= pages}
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                        aria-label="Next page"
                        className="cursor-pointer rounded-full bg-res-surface p-2.5 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {details && (
        <Modal
          isOpen
          onClose={() => setDetails(null)}
          title={details.name}
          subtitle={`${categoryName(details)} · ${money(sellPrice(details))}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="type-res-small cursor-pointer rounded-full border border-res-line bg-res-card px-4 py-2.5 font-semibold text-res-ink hover:text-res-brand"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetails(null);
                  editDish(details._id);
                }}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-5 py-2.5 font-semibold text-res-ink transition-colors hover:text-res-brand"
              >
                Edit dish
              </button>
              <button
                type="button"
                onClick={() => handleDelete(details._id)}
                className="type-res-small cursor-pointer rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white shadow-res-low transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {(details.images?.[0] || details.coverImage) && (
              <img
                src={details.images?.[0] || details.coverImage}
                alt={details.name}
                className="h-48 w-full rounded-res-md object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
                  isAvailable(details)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {isAvailable(details) ? 'Available' : 'Unavailable'}
              </span>
              {isDeal(details) && (
                <span className="type-res-small inline-flex items-center rounded-full bg-res-brand px-2.5 py-1 font-semibold whitespace-nowrap text-res-ink-inverted">
                  Deal
                </span>
              )}
              <span className="type-res-small rounded-full bg-res-surface px-2.5 py-1 font-semibold text-res-ink-muted">
                {details.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
            </div>
            {details.description && (
              <p className="type-res-body font-normal text-res-ink">{details.description}</p>
            )}
            <dl className="type-res-small space-y-1.5 rounded-res-md bg-res-surface p-4 font-normal text-res-ink-muted">
              <div className="flex justify-between gap-2">
                <dt>Price</dt>
                <dd className="font-semibold text-res-ink">{money(sellPrice(details))}</dd>
              </div>
              {isDeal(details) && (
                <div className="flex justify-between gap-2">
                  <dt>Original price</dt>
                  <dd className="font-medium text-res-ink line-through">
                    {money(details.price)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt>Category</dt>
                <dd className="font-medium text-res-ink">{categoryName(details)}</dd>
              </div>
              {(details.mealTimes ?? []).length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt>Meal times</dt>
                  <dd className="text-right font-medium text-res-ink">
                    {details.mealTimes!.join(', ')}
                  </dd>
                </div>
              )}
              {(details.tags ?? []).length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt>Tags</dt>
                  <dd className="text-right font-medium text-res-ink">
                    {details.tags!.join(', ')}
                  </dd>
                </div>
              )}
              {(details.addonIds?.length ?? 0) > 0 && (
                <div className="flex justify-between gap-2">
                  <dt>Add-ons</dt>
                  <dd className="font-medium text-res-ink">
                    {details.addonIds!.length} available
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MenuDashboard;
