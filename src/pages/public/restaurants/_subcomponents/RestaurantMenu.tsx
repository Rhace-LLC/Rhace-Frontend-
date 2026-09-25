import { catalogService } from '@/services/catalog.service';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import UniversalLoader from '@/components/user/ui/LogoLoader';

interface Category {
  name: string;
  category: string;
}

interface MenuDisplayItem {
  _id: string;
  name: string;
  category: string;
  price: number;
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
                  : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
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

interface MenuItemCardProps {
  type: string;
  name: string;
  price: number;
}

const MenuItemCard = ({ type, name, price }: MenuItemCardProps) => {
  return (
    <article className="flex min-h-[132px] w-full flex-col justify-between rounded-res-md bg-res-card p-4 shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div>
        {type ? (
          <p className="type-res-caption mb-2 font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {type}
          </p>
        ) : null}
        <h3 className="type-res-h3 text-res-ink">{name}</h3>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-res-line pt-3">
        <p className="type-res-body font-semibold text-res-ink">
          ₦{price.toLocaleString()}
        </p>
        <span className="type-res-small rounded-full bg-res-secondary px-3 py-1 font-semibold text-res-brand">
          Available
        </span>
      </div>
    </article>
  );
};

interface RestaurantMenuProps {
  id: string;
}

export default function RestaurantMenu({ id }: RestaurantMenuProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [itemsToShow, setItemsToShow] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuDisplayItem[]>([]);
  const LOAD_MORE_STEP = 3;

  const fetchMenus = async () => {
    try {
      const dishes = await catalogService.getDishes(id);
      setMenuItems(
        dishes.map((dish) => ({
          _id: dish._id,
          name: dish.name,
          category:
            (typeof dish.categoryId === 'object' && dish.categoryId?.name) || '',
          price: dish.discount && dish.discountPrice ? dish.discountPrice : dish.price,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const categories: Category[] = useMemo(() => {
    const names = Array.from(
      new Set(menuItems.map((item) => item.category).filter(Boolean))
    );
    return [
      { name: 'All', category: 'All' },
      ...names.map((name) => ({ name, category: name })),
    ];
  }, [menuItems]);
  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems?.filter((item) => item.category === activeCategory);

  const displayedItems = filteredItems?.slice(0, itemsToShow);

  const hasMore = (filteredItems ? filteredItems.length : 0) > itemsToShow;

  const handleShowMore = () => {
    setItemsToShow((prev) =>
      Math.min(prev + LOAD_MORE_STEP, filteredItems ? filteredItems.length : 0)
    );
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setItemsToShow(3);
  };

  if (isLoading) return <UniversalLoader />;

  return (
    <div className="rounded-res-md bg-res-surface p-3 sm:p-4">
      <div className="w-full">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>
      <>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {displayedItems && displayedItems.length > 0 ? (
            displayedItems?.map((item) => (
              <MenuItemCard
                key={item._id}
                type={item.category}
                name={item.name}
                price={item.price}
              />
            ))
          ) : (
            <div className="col-span-full rounded-res-md bg-res-card px-6 py-10 text-center shadow-res-low">
              <p className="type-res-h3 text-res-ink">No dishes in this category</p>
              <p className="type-res-small mt-1 text-res-ink-muted">
                Sorry, no available menu for this category yet.
              </p>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleShowMore}
              className="type-res-body flex cursor-pointer items-center gap-2 rounded-full bg-res-card px-6 py-2.5 text-res-brand shadow-res-low transition-all duration-200 hover:shadow-res-medium"
            >
              Show more <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </>
    </div>
  );
}
