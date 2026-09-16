import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Ban, Loader2, RefreshCw, Search, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { stockService, type StockItem, type StockItemKind } from '@/services/stock.service';

/**
 * Stock controller / 86-list. Pulling an item marks it unavailable for ordering
 * and is audited server-side as `item_86`.
 */
export default function Item86Panel({ kinds }: { kinds: StockItemKind[] }) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // `kinds` is a fresh array on every render, so depend on its contents.
  const kindsKey = kinds.join(',');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await stockService.list(kindsKey.split(',') as StockItemKind[]);
      setItems(res);
    } catch {
      toast.error('Failed to load the menu for 86-ing');
    } finally {
      setIsLoading(false);
    }
  }, [kindsKey]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, search]);

  const unavailable = items.filter((item) => !item.available).length;

  const toggle = async (item: StockItem) => {
    try {
      setBusyId(item.id);
      await stockService.setAvailability(item.kind, item.id, !item.available);
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, available: !item.available } : entry)),
      );
      toast.success(item.available ? `${item.name} is 86'd` : `${item.name} is back on`);
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update availability',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="w-4 h-4" /> 86 list
          <Badge variant={unavailable ? 'destructive' : 'secondary'}>{unavailable} off</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-44"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items match this search.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <Button
                key={`${item.kind}-${item.id}`}
                variant={item.available ? 'outline' : 'destructive'}
                className="justify-between"
                disabled={busyId === item.id}
                onClick={() => toggle(item)}
                title={item.available ? 'Mark out of stock' : 'Mark back in stock'}
              >
                <span className="truncate">{item.name}</span>
                {busyId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : item.available ? (
                  <Ban className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Undo2 className="w-4 h-4" />
                )}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
