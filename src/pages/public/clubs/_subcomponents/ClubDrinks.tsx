import { useEffect, useState } from 'react';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import {
  catalogService,
  type VendorBottleSetDto,
  type VendorDrinkDto,
} from '@/services/catalog.service';

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

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Drinks</h3>
        {drinks.length === 0 ? (
          <p className="text-sm text-gray-500">No drinks listed yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {drinks.map((drink) => (
              <div key={drink._id} className="rounded-xl border border-gray-200 bg-white p-3">
                {drink.images?.[0] && (
                  <img
                    src={drink.images[0]}
                    alt={drink.name}
                    className="mb-2 h-28 w-full rounded-lg object-cover"
                  />
                )}
                <p className="text-sm font-medium text-gray-900">{drink.name}</p>
                <p className="text-xs text-gray-400">
                  {typeof drink.categoryId === 'object' ? drink.categoryId?.name : ''}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  ₦{drink.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {sets.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Bottle sets</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sets.map((set) => (
              <div key={set._id} className="rounded-xl border border-gray-200 bg-white p-3">
                {set.image && (
                  <img
                    src={set.image}
                    alt={set.name}
                    className="mb-2 h-28 w-full rounded-lg object-cover"
                  />
                )}
                <p className="text-sm font-medium text-gray-900">{set.name}</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  ₦{set.setPrice.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
