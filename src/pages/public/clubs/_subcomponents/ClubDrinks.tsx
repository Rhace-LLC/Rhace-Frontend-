import { useEffect, useMemo, useState } from 'react';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import {
  catalogService,
  type VendorBottleSetDto,
  type VendorDrinkDto,
} from '@/services/catalog.service';
import { GlassWater, Package, Plus, Search } from 'lucide-react';

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="type-res-h3 text-res-ink">{title}</h3>
      <span className="type-res-small rounded-full bg-res-card px-2.5 py-0.5 font-semibold text-res-ink-muted shadow-res-low">
        {count}
      </span>
    </div>
  );
}

function getDrinkCategory(drink: VendorDrinkDto): string {
  return (typeof drink.categoryId === 'object' && drink.categoryId?.name) || '';
}

function DrinkCard({ drink }: { drink: VendorDrinkDto }) {
  const category = getDrinkCategory(drink);
  const image = drink.images?.[0] || '';
  const hasDeal = Boolean(
    drink.discountPrice && drink.discountPrice < drink.price
  );
  const salePrice = hasDeal ? drink.discountPrice! : drink.price;
  const offPct = hasDeal
    ? Math.round(((drink.price - drink.discountPrice!) / drink.price) * 100)
    : 0;
  const addonCount = Array.isArray(drink.addonIds) ? drink.addonIds.length : 0;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-res-md bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div className="relative bg-res-card p-1.5 pb-0">
        {image ? (
          <img
            src={image}
            alt={drink.name}
            loading="lazy"
            className="h-36 w-full rounded-res-sm object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center rounded-res-sm bg-res-surface">
            <span className="rounded-full bg-res-card p-2.5 shadow-res-low">
              <GlassWater className="h-5 w-5 text-res-brand" />
            </span>
          </div>
        )}
        {hasDeal ? (
          <span className="type-res-small absolute top-3.5 left-3.5 rounded-full bg-res-brand px-2.5 py-1 font-semibold text-res-ink-inverted shadow-res-low">
            -{offPct}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5">
          {category ? (
            <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
              {category}
            </p>
          ) : null}
          {drink.volume ? (
            <span className="type-res-caption rounded-full bg-res-surface px-2 py-0.5 font-semibold text-res-ink-muted">
              {drink.volume}
            </span>
          ) : null}
        </div>
        <p className="type-res-h3 mt-1 line-clamp-1 text-res-ink">{drink.name}</p>
        {drink.description ? (
          <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
            {drink.description}
          </p>
        ) : (
          <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
            {category ? `${category} pour` : 'House pour'}, served chilled.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
            Available
          </span>
          {addonCount > 0 ? (
            <span className="type-res-small flex items-center gap-1 rounded-full bg-res-surface px-2.5 py-1 font-medium text-res-ink-muted">
              <Plus className="h-3 w-3" />{addonCount} mixer{addonCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
          <p className="type-res-h3 text-res-ink">₦{salePrice.toLocaleString()}</p>
          {hasDeal ? (
            <p className="type-res-small font-medium text-res-ink-muted line-through">
              ₦{drink.price.toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BottleSetCard({ set }: { set: VendorBottleSetDto }) {
  const items = Array.isArray(set.items) ? set.items : [];
  const visible = items.slice(0, 3);
  const extra = items.length - visible.length;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-res-md bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      <div className="relative bg-res-card p-1.5 pb-0">
        {set.image ? (
          <img
            src={set.image}
            alt={set.name}
            loading="lazy"
            className="h-36 w-full rounded-res-sm object-cover"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center rounded-res-sm bg-res-surface">
            <span className="rounded-full bg-res-card p-2.5 shadow-res-low">
              <Package className="h-5 w-5 text-res-brand" />
            </span>
          </div>
        )}
        {set.discount ? (
          <span className="type-res-small absolute top-3.5 left-3.5 rounded-full bg-res-brand px-2.5 py-1 font-semibold text-res-ink-inverted shadow-res-low">
            Set deal
          </span>
        ) : (
          <span className="type-res-small absolute top-3.5 left-3.5 rounded-full bg-res-card px-2.5 py-1 font-semibold text-res-brand shadow-res-low">
            Bottle set
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
          Bottle set · {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <p className="type-res-h3 mt-1 line-clamp-1 text-res-ink">{set.name}</p>
        {visible.length > 0 ? (
          <ul className="type-res-small mt-2 space-y-1 font-normal text-res-ink-muted">
            {visible.map((it, i) => (
              <li key={i} className="line-clamp-1">
                {it.quantity ? `${it.quantity}× ` : ''}
                {it.drinkId?.name || 'Drink'}
              </li>
            ))}
            {extra > 0 ? <li>+{extra} more</li> : null}
          </ul>
        ) : (
          <p className="type-res-body mt-1.5 line-clamp-2 min-h-[36px] font-normal text-res-ink-muted">
            Curated bottles + mixers for the table.
          </p>
        )}
        <div className="mt-3 flex items-baseline gap-2 border-t border-res-line pt-3">
          <p className="type-res-h3 text-res-ink">₦{set.setPrice.toLocaleString()}</p>
        </div>
      </div>
    </article>
  );
}

/** Public club drinks + bottle sets (replaces the legacy tables view). */
export default function ClubDrinks({ id }: { id?: string }) {
  const [drinks, setDrinks] = useState<VendorDrinkDto[]>([]);
  const [sets, setSets] = useState<VendorBottleSetDto[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([catalogService.getDrinks(id), catalogService.getBottleSets(id)])
      .then(([drinkList, setList]) => {
        if (!active) return;
        setDrinks(drinkList);
        setSets(setList);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const categories = useMemo(() => {
    const names = Array.from(
      new Set(drinks.map(getDrinkCategory).filter(Boolean))
    );
    return ['All', ...names];
  }, [drinks]);

  const filteredDrinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drinks.filter((d) => {
      if (activeCategory !== 'All' && getDrinkCategory(d) !== activeCategory)
        return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [drinks, query, activeCategory]);

  const filteredSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => s.name.toLowerCase().includes(q));
  }, [sets, query]);

  if (loading) return <UniversalLoader />;

  if (drinks.length === 0 && sets.length === 0) {
    return (
      <div className="rounded-res-md bg-res-surface p-3 sm:p-4">
        <div className="rounded-res-md bg-res-card px-6 py-10 text-center shadow-res-low">
          <p className="type-res-h3 text-res-ink">No drinks listed yet</p>
          <p className="type-res-small mt-1 text-res-ink-muted">
            Check back soon for the updated drinks list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-res-md bg-res-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SectionHeader title="Drinks" count={filteredDrinks.length} />
          <label className="flex items-center gap-2 rounded-full bg-res-card px-4 py-2.5 shadow-res-low">
            <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drinks or sets..."
              className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted md:w-52"
            />
          </label>
        </div>
        {categories.length > 1 ? (
          <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
            <div className="flex w-max gap-2">
              {categories.map((c) => {
                const isActive = activeCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    aria-pressed={isActive}
                    className={`type-res-small cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                      isActive
                        ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                        : 'bg-res-card text-res-ink-muted shadow-res-low hover:text-res-ink'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <section className="mt-4">
        {filteredDrinks.length === 0 ? (
          <p className="type-res-small text-res-ink-muted">No drinks match your search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrinks.map((drink) => (
              <DrinkCard key={drink._id} drink={drink} />
            ))}
          </div>
        )}
      </section>

      {filteredSets.length > 0 && (
        <section className="mt-6">
          <div className="mb-3">
            <SectionHeader title="Bottle sets" count={filteredSets.length} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.map((set) => (
              <BottleSetCard key={set._id} set={set} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
