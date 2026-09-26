import { catalogService, type VendorDishDto } from '@/services/catalog.service';
import { ChevronDown, Plus, Search, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import UniversalLoader from '@/components/user/ui/LogoLoader';

interface Category {
  name: string;
  category: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
      <div className="flex w-max gap-2">
        {categories.map((category) => {
          const isActive = activeCategory === category.category;
          return (
            <button
              key={category.name}
              onClick={() => onCategoryChange(category.category)}
              aria-pressed={isActive}
              className={`type-res-small cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                isActive
                  ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                  : 'bg-res-card text-res-ink-muted shadow-res-low hover:text-res-ink'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function getDishImage(dish: VendorDishDto): string {
  if (dish.images?.[0]) return dish.images[0];
  if (dish.coverImage) return dish.coverImage;
  return '';
}

function getCategoryName(dish: VendorDishDto): string {
  return (typeof dish.categoryId === 'object' && dish.categoryId?.name) || '';
}

function MenuItemCard({ dish }: { dish: VendorDishDto }) {
  const category = getCategoryName(dish);
  const image = getDishImage(dish);
  const hasDeal = Boolean(dish.discount && dish.discountPrice && dish.discountPrice < dish.price);
  const salePrice = hasDeal ? dish.discountPrice! : dish.price;
  const offPct = hasDeal
    ? Math.round(((dish.price - dish.discountPrice!) / dish.price) * 100)
    : 0;
  const addonCount = Array.isArray(dish.addonIds) ? dish.addonIds.length : 0;
  const initials = dish.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-res-md bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div className="relative bg-res-card p-1.5 pb-0">
        {image ? (
          <img
            src={image}
            alt={dish.name}
            loading="lazy"
            className="h-40 w-full rounded-res-sm object-cover"
          />
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-res-sm bg-res-surface">
            <span className="rounded-full bg-res-card p-2.5 shadow-res-low">
              <UtensilsCrossed className="h-5 w-5 text-res-brand" />
            </span>
            <span className="type-res-h3 text-res-ink-muted">{initials}</span>
          </div>
        )}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          {hasDeal ? (
            <span className="type-res-small rounded-full bg-res-brand px-2.5 py-1 font-semibold text-res-ink-inverted shadow-res-low">
              -{offPct}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {category ? (
          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {category}
          </p>
        ) : null}
        <h3 className="type-res-h3 mt-1 line-clamp-1 text-res-ink">{dish.name}</h3>
        {dish.description ? (
          <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
            {dish.description}
          </p>
        ) : (
          <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
            Chef-crafted favourite, prepared fresh to order.
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
            Available
          </span>
          {addonCount > 0 ? (
            <span className="type-res-small flex items-center gap-1 rounded-full bg-res-surface px-2.5 py-1 font-medium text-res-ink-muted">
              <Plus className="h-3 w-3" />
              {addonCount} add-on{addonCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
          <p className="type-res-h3 text-res-ink">₦{salePrice.toLocaleString()}</p>
          {hasDeal ? (
            <p className="type-res-small font-medium text-res-ink-muted line-through">
              ₦{dish.price.toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

interface RestaurantMenuProps {
  id: string;
}

export default function RestaurantMenu({ id }: RestaurantMenuProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [itemsToShow, setItemsToShow] = useState(6);
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<VendorDishDto[]>([]);
  const LOAD_MORE_STEP = 6;

  useEffect(() => {
    let active = true;
    catalogService
      .getDishes(id)
      .then((dishes) => active && setMenuItems(dishes))
      .catch((err) => console.error(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const categories: Category[] = useMemo(() => {
    const names = Array.from(
      new Set(menuItems.map(getCategoryName).filter(Boolean))
    );
    return [
      { name: 'All', category: 'All' },
      ...names.map((name) => ({ name, category: name })),
    ];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const inCategory =
        activeCategory === 'All' || getCategoryName(item) === activeCategory;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [menuItems, activeCategory, query]);

  const displayedItems = filteredItems.slice(0, itemsToShow);
  const hasMore = filteredItems.length > itemsToShow;

  const handleShowMore = () => {
    setItemsToShow((prev) => Math.min(prev + LOAD_MORE_STEP, filteredItems.length));
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setItemsToShow(6);
  };

  if (isLoading) return <UniversalLoader />;

  return (
    <div className="rounded-res-md bg-res-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="type-res-h3 text-res-ink">Menu</h3>
            <p className="type-res-small text-res-ink-muted">
              {filteredItems.length} dish{filteredItems.length === 1 ? '' : 'es'}
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-full bg-res-card px-4 py-2.5 shadow-res-low">
            <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setItemsToShow(6);
              }}
              placeholder="Search dishes..."
              className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted md:w-52"
            />
          </label>
        </div>
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedItems.length > 0 ? (
          displayedItems.map((item) => <MenuItemCard key={item._id} dish={item} />)
        ) : (
          <div className="col-span-full rounded-res-md bg-res-card px-6 py-10 text-center shadow-res-low">
            <p className="type-res-h3 text-res-ink">No dishes found</p>
            <p className="type-res-small mt-1 text-res-ink-muted">
              {query
                ? `Nothing matches "${query}" in this category yet.`
                : 'Sorry, no available menu for this category yet.'}
            </p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleShowMore}
            className="type-res-body flex cursor-pointer items-center gap-2 rounded-full bg-res-card px-6 py-2.5 font-semibold text-res-brand shadow-res-low transition-all duration-200 hover:shadow-res-medium"
          >
            Show more <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
