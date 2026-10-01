import { useEffect, useMemo, useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import { useAuth } from '@/contexts/AuthContext';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { clubService } from '@/services/club.service';
import { stockService } from '@/services/stock.service';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import { DrinkWorkspace } from './components/DrinkWorkspace';

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

/** Legacy statuses collapse to Active/Inactive; unknown values read as Active. */
const isDrinkAvailable = (status: unknown): boolean => {
  const s = String(status ?? '').toLowerCase();
  return s !== 'hidden' && s !== 'inactive' && s !== 'unavailable';
};

const drinkPrice = (item: any): number =>
  item.discountPrice && item.price && item.discountPrice < item.price
    ? item.discountPrice
    : (item.price ?? 0);

const isDrinkDeal = (item: any): boolean =>
  Boolean(item.discountPrice && item.price && item.discountPrice < item.price);

const drinkCategoryName = (item: any): string => {
  if (typeof item.categoryId === 'object' && item.categoryId !== null) {
    return String((item.categoryId as { name?: string }).name ?? item.category ?? '');
  }
  return String(item.category ?? 'Uncategorized') || 'Uncategorized';
};

export function DrinksTable({
  onAddBottleSet,
  onEditDrink,
  vendorId: vendorIdProp,
  vertical: verticalProp,
}: {
  /** Embedded use (e.g. manager hub): intercept vendor-shell navigation. */
  onAddBottleSet?: () => void;
  onEditDrink?: (id: string) => void;
  /** Staff logins carry no vendor session — pass the venue id explicitly. */
  vendorId?: string;
  /** Bottle sets are a club concept; restaurants never see them. */
  vertical?: 'club' | 'restaurant';
} = {}) {
  const [drinks, setDrinks] = useState<any[]>([]);
  const [bottleSets, setBottleSets] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'drinks' | 'sets'>('drinks');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { vendor } = useAuth();
  const vendorId = vendorIdProp ?? vendor?._id;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const drinkParam = searchParams.get('drink');

  const vertical =
    verticalProp ??
    (vendor?.vendorType?.toLowerCase() === 'restaurant' ? 'restaurant' : 'club');
  const isClub = vertical !== 'restaurant';

  const resetPage = () => setPage(1);

  const fetchDrinks = async () => {
    try {
      if (!vendorId) return;
      const data = await clubService.getDrinks(vendorId);
      setDrinks(data.drinks || []);
    } catch (error) {
      console.error('Error fetching drinks:', error);
      toast.error('Failed to fetch drinks');
    }
  };

  const fetchBottleSets = async () => {
    try {
      if (!vendorId) return;
      const data = await clubService.getBottleSet(vendorId);
      setBottleSets(data.bottleSets || []);
    } catch (error) {
      console.error('Error fetching bottle sets:', error);
      toast.error('Failed to fetch bottle sets');
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchDrinks();
      if (isClub) await fetchBottleSets();
      else setBottleSets([]);
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, isClub]);

  const stats = useMemo(() => {
    const available = drinks.filter((d) => isDrinkAvailable(d.status)).length;
    const categories = new Set(drinks.map((d) => drinkCategoryName(d).toLowerCase())).size;
    return [
      { label: 'Total drinks', value: String(drinks.length) },
      { label: 'Available', value: String(available) },
      { label: 'Unavailable', value: String(drinks.length - available) },
      isClub
        ? { label: 'Bottle sets', value: String(bottleSets.length) }
        : { label: 'Categories', value: String(categories) },
    ];
  }, [drinks, bottleSets, isClub]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const drink of drinks) {
      const name = drinkCategoryName(drink);
      if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [drinks]);

  const filteredDrinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = drinks.filter((item) => {
      if (category !== 'all' && drinkCategoryName(item).toLowerCase() !== category) return false;
      if (availability === 'available' && !isDrinkAvailable(item.status)) return false;
      if (availability === 'unavailable' && isDrinkAvailable(item.status)) return false;
      if (!term) return true;
      return (
        String(item.name ?? '').toLowerCase().includes(term) ||
        String(item.description ?? '').toLowerCase().includes(term) ||
        drinkCategoryName(item).toLowerCase().includes(term)
      );
    });
    const sorted = [...list];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
        break;
      case 'price-asc':
        sorted.sort((a, b) => drinkPrice(a) - drinkPrice(b));
        break;
      case 'price-desc':
        sorted.sort((a, b) => drinkPrice(b) - drinkPrice(a));
        break;
      case 'newest':
      default:
        break;
    }
    return sorted;
  }, [drinks, searchTerm, category, availability, sort]);

  const hasFilters =
    searchTerm.trim() !== '' || category !== 'all' || availability !== 'all' || sort !== 'newest';

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('all');
    setAvailability('all');
    setSort('newest');
    resetPage();
  };

  const showingSets = isClub && selectedTab === 'sets';
  const listLength = showingSets ? bottleSets.length : filteredDrinks.length;
  const pages = Math.max(1, Math.ceil(listLength / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visibleDrinks = showingSets
    ? []
    : filteredDrinks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const visibleSets = showingSets
    ? bottleSets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : [];

  const toggleAvailability = async (item: any) => {
    const next = !isDrinkAvailable(item.status);
    try {
      setBusyId(item._id);
      await stockService.setAvailability('drink', item._id, next);
      setDrinks((prev) =>
        prev.map((entry) =>
          entry._id === item._id ? { ...entry, status: next ? 'Active' : 'hidden' } : entry,
        ),
      );
      toast.success(next ? `${item.name} is available again` : `${item.name} marked unavailable`);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update availability',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return;
    try {
      await clubService.deleteDrink(item._id);
      toast.success('Drink deleted');
      setDrinks((prev) => prev.filter((entry) => entry._id !== item._id));
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete drink.',
      );
    }
  };

  const editDrink = (id: string) => {
    if (onEditDrink) onEditDrink(id);
    else setSearchParams({ drink: id });
  };

  const handleWorkspaceSaved = () => {
    setSearchParams({});
    fetchDrinks();
  };

  if (isLoading) {
    return <UniversalLoader type="dashboard-3" />;
  }

  if (drinkParam) {
    return (
      <div className="mb-12 space-y-6 md:p-6">
        <DrinkWorkspace
          mode={drinkParam === 'new' ? 'new' : 'edit'}
          drinkId={drinkParam === 'new' ? undefined : drinkParam}
          onExit={() => setSearchParams({})}
          onSaved={handleWorkspaceSaved}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-12 space-y-6 md:p-6">
        <DashboardPageHeader
          title="Drinks"
          subtitle="Stock, price and organize the drinks guests can order."
          actions={
            <>
              {isClub && (
                <DashboardButton
                  variant="secondary"
                  text="Add Bottle Set"
                  onClick={() =>
                    onAddBottleSet ? onAddBottleSet() : navigate('/dashboard/club/add-drinks')
                  }
                />
              )}
              <DashboardButton
                variant="primary"
                text="Add Drink"
                onClick={() => setSearchParams({ drink: 'new' })}
              />
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((card) => (
            <div
              key={card.label}
              className="rounded-res-md border border-res-line bg-res-card p-4 shadow-res-low"
            >
              <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                {card.label}
              </p>
              <p className="type-res-h2 mt-1 text-res-ink">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
          {isClub && (
            <div
              role="tablist"
              aria-label="Drinks or bottle sets"
              className="flex w-full gap-1 rounded-res-md bg-res-surface p-1 sm:w-max sm:rounded-full"
            >
              {(
                [
                  { id: 'drinks', label: `Drinks · ${drinks.length}` },
                  { id: 'sets', label: `Bottle sets · ${bottleSets.length}` },
                ] as const
              ).map((tab) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setSelectedTab(tab.id);
                      resetPage();
                    }}
                    className={`type-res-body flex-1 cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
                      isActive
                        ? 'bg-res-card text-res-brand shadow-res-low'
                        : 'text-res-ink-muted hover:text-res-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {!showingSets && (
            <div className={`${isClub ? 'mt-4' : ''} flex flex-wrap items-center gap-2.5`}>
              <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-res-surface px-4 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPage();
                  }}
                  placeholder="Search drinks…"
                  aria-label="Search drinks"
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
                aria-label="Sort drinks"
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
          )}

          <div className="mt-4">
            {showingSets ? (
              visibleSets.length === 0 ? (
                <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
                  <p className="type-res-h3 text-res-ink">No bottle sets yet</p>
                  <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                    Bundle drinks into bottle sets guests can order together.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleSets.map((set: any) => {
                    const contents: string[] = (set.items ?? [])
                      .slice(0, 3)
                      .map(
                        (it: any) =>
                          `${it.quantity ? `${it.quantity}× ` : ''}${it.drinkId?.name ?? 'Drink'}`,
                      );
                    if ((set.items ?? []).length > 3)
                      contents.push(`+${(set.items ?? []).length - 3} more`);
                    const drinkCount: number = (set.items ?? []).reduce(
                      (sum: number, it: any) => sum + (it.quantity ?? 0),
                      0,
                    );
                    return (
                      <article
                        key={set._id}
                        className="flex w-full flex-col overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-low"
                      >
                        <div className="relative h-44 shrink-0 bg-res-surface">
                          {set.image ? (
                            <img
                              src={set.image}
                              alt={set.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="type-res-small font-medium text-res-ink-muted">
                                No photo
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                            Bottle set
                          </p>
                          <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">
                            {set.name}
                          </h3>
                          {contents.length > 0 && (
                            <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                              {contents.join(' · ')}
                            </p>
                          )}
                          <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
                            <p className="type-res-h3 text-res-ink">{money(set.setPrice)}</p>
                            <span className="type-res-small ml-auto font-normal whitespace-nowrap text-res-ink-muted">
                              {drinkCount} drink{drinkCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : filteredDrinks.length === 0 ? (
              <div className="rounded-res-md bg-res-surface px-6 py-12 text-center">
                <p className="type-res-h3 text-res-ink">
                  {drinks.length === 0 ? 'No drinks yet' : 'No drinks match'}
                </p>
                <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                  {drinks.length === 0
                    ? 'Add your first drink and it will show up here.'
                    : 'Try adjusting the search or filters.'}
                </p>
              </div>
            ) : (
              <>
                <p className="type-res-small mb-3 font-normal text-res-ink-muted">
                  {filteredDrinks.length} drink{filteredDrinks.length === 1 ? '' : 's'}
                  {hasFilters ? ' match these filters' : ' on the menu'}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleDrinks.map((item: any) => {
                    const available = isDrinkAvailable(item.status);
                    const deal = isDrinkDeal(item);
                    const image = item.images?.[0] || item.image;
                    const description = String(item.description ?? '');
                    const volume = String(item.volume ?? '');
                    const busy = busyId === item._id;
                    const quantity = typeof item.quantity === 'number' ? item.quantity : null;
                    const addonCount = Array.isArray(item.addonIds)
                      ? item.addonIds.length
                      : Array.isArray(item.addOns)
                        ? item.addOns.length
                        : 0;
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
                            {drinkCategoryName(item)}
                            {volume ? ` · ${volume}` : ''}
                          </p>
                          <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">
                            {item.name}
                          </h3>
                          {description && (
                            <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                              {description}
                            </p>
                          )}

                          <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
                            <p className="type-res-h3 text-res-ink">{money(drinkPrice(item))}</p>
                            {deal && (
                              <p className="type-res-small font-medium text-res-ink-muted line-through">
                                {money(item.price)}
                              </p>
                            )}
                            <span className="type-res-small ml-auto font-normal whitespace-nowrap text-res-ink-muted">
                              {quantity !== null && quantity > 0 ? `${quantity} in stock` : ''}
                              {quantity !== null && quantity > 0 && addonCount > 0 ? ' · ' : ''}
                              {addonCount > 0
                                ? `${addonCount} add-on${addonCount === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="type-res-small cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-red-600 transition-colors outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => editDrink(item._id)}
                              className="type-res-small flex-1 cursor-pointer rounded-full bg-res-surface px-4 py-2 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
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
                    Page {safePage} of {pages} · {listLength} total
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
    </>
  );
}

export default DrinksTable;
