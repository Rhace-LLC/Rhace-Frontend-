import { useEffect, useState } from 'react';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import {
  catalogService,
  type VendorBottleSetDto,
  type VendorDrinkDto,
} from '@/services/catalog.service';

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h3 className="type-res-h3 text-res-ink">{title}</h3>
      <span className="type-res-small rounded-full bg-res-card px-2.5 py-0.5 font-semibold text-res-ink-muted shadow-res-low">
        {count}
      </span>
    </div>
  );
}

function DrinkCard({ drink }: { drink: VendorDrinkDto }) {
  const category =
    typeof drink.categoryId === 'object' ? drink.categoryId?.name : '';
  return (
    <article className="overflow-hidden rounded-res-md bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      {drink.images?.[0] ? (
        <div className="bg-res-surface p-1.5 pb-0">
          <img
            src={drink.images[0]}
            alt={drink.name}
            loading="lazy"
            className="h-28 w-full rounded-res-sm object-cover"
          />
        </div>
      ) : null}
      <div className="p-3.5">
        {category ? (
          <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
            {category}
          </p>
        ) : null}
        <p className="type-res-body mt-1 font-semibold text-res-ink">{drink.name}</p>
        <div className="mt-3 flex items-center justify-between border-t border-res-line pt-2.5">
          <p className="type-res-body font-semibold text-res-ink">
            ₦{drink.price.toLocaleString()}
          </p>
          <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
            Available
          </span>
        </div>
      </div>
    </article>
  );
}

function BottleSetCard({ set }: { set: VendorBottleSetDto }) {
  return (
    <article className="overflow-hidden rounded-res-md bg-res-card shadow-res-low transition-all duration-200 hover:shadow-res-medium">
      {set.image ? (
        <div className="bg-res-surface p-1.5 pb-0">
          <img
            src={set.image}
            alt={set.name}
            loading="lazy"
            className="h-28 w-full rounded-res-sm object-cover"
          />
        </div>
      ) : null}
      <div className="p-3.5">
        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
          Bottle set
        </p>
        <p className="type-res-body mt-1 font-semibold text-res-ink">{set.name}</p>
        <div className="mt-3 flex items-center justify-between border-t border-res-line pt-2.5">
          <p className="type-res-body font-semibold text-res-ink">
            ₦{set.setPrice.toLocaleString()}
          </p>
          <span className="type-res-small rounded-full bg-res-secondary px-2.5 py-1 font-semibold text-res-brand">
            Set
          </span>
        </div>
      </div>
    </article>
  );
}

/** Public club drinks + bottle sets (replaces the legacy tables view). */
export default function ClubDrinks({ id }: { id?: string }) {
  const [drinks, setDrinks] = useState<VendorDrinkDto[]>([]);
  const [sets, setSets] = useState<VendorBottleSetDto[]>([]);
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
      <section>
        <SectionHeader title="Drinks" count={drinks.length} />
        {drinks.length === 0 ? (
          <p className="type-res-small text-res-ink-muted">No drinks listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((drink) => (
              <DrinkCard key={drink._id} drink={drink} />
            ))}
          </div>
        )}
      </section>

      {sets.length > 0 && (
        <section className="mt-6">
          <SectionHeader title="Bottle sets" count={sets.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <BottleSetCard key={set._id} set={set} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
