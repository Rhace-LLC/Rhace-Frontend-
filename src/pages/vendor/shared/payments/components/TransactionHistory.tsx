import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, Search, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paymentService, type TransactionDto, type TransactionQuery } from '@/services/payment.service';
import { formatMoney } from '@/utils/money';
import { errorMessage, useTransactions } from '../report/queries';
import { useReportFilters } from '../report/useReportFilters';
import { EmptyState, ErrorState, ProviderBadge, ReportCard, StatusPill } from '../report/ui';
import { PROVIDER_LABEL, SOURCE_LABEL, STATUS_LABEL, methodLabel } from '../report/labels';
import PaymentDetailsDialog from './PaymentDetailDialog';

const PAGE_SIZES = [25, 50, 100];
const COLUMNS_KEY = 'rhace.payments.columns';

const FILTERS = {
  status: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
  provider: Object.entries(PROVIDER_LABEL).map(([value, label]) => ({ value, label })),
  source: Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label })),
} as const;
type FilterKey = keyof typeof FILTERS;
const FILTER_TITLES: Record<FilterKey, string> = { status: 'Status', provider: 'Channel', source: 'Source' };

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  });

const readColumns = (): VisibilityState => {
  try {
    return JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? '{}') as VisibilityState;
  } catch {
    return {};
  }
};

/** Server-paginated, filterable payments ledger. Filters live in the URL. */
export default function PaymentTransactionHistory() {
  const { params } = useReportFilters();
  const [search, setSearch] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(readColumns);
  const [qDraft, setQDraft] = useState(search.get('q') ?? '');

  const list = (key: string) => (search.get(key) ?? '').split(',').filter(Boolean);
  const page = Math.max(1, Number(search.get('page')) || 1);
  const limit = PAGE_SIZES.includes(Number(search.get('limit'))) ? Number(search.get('limit')) : 25;
  const sort = (search.get('sort') as TransactionQuery['sort']) || '-paidAt';
  const q = search.get('q') ?? '';

  const query: TransactionQuery = {
    ...params,
    page,
    limit,
    sort,
    q: q.length >= 3 ? q : undefined,
    status: list('status'),
    provider: list('provider'),
    source: list('source'),
  };
  const result = useTransactions(query);
  const rows = result.data?.items ?? [];
  const total = result.data?.total ?? 0;
  const pages = result.data?.pages ?? 1;

  const setParams = (changes: Record<string, string | null>, resetPage = true) =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );

  // Debounced search: the URL (and the query) only change after typing pauses.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (qDraft.trim() !== q) setParams({ q: qDraft.trim() || null });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columnVisibility));
    } catch {
      /* private mode: keep it for this visit only */
    }
  }, [columnVisibility]);

  const toggleFilter = (key: FilterKey, value: string) => {
    const current = new Set(list(key));
    if (current.has(value)) current.delete(value);
    else current.add(value);
    setParams({ [key]: [...current].join(',') || null });
  };

  const activeFilters = (['status', 'provider', 'source'] as FilterKey[]).some((k) => list(k).length) || q;

  const sorting: SortingState = useMemo(() => {
    const desc = sort.startsWith('-');
    return [{ id: sort.replace('-', '') === 'paidAt' ? 'at' : 'amount', desc }];
  }, [sort]);

  const toggleSort = (id: 'at' | 'amount') => {
    const field = id === 'at' ? 'paidAt' : 'amount';
    const next = sort === `-${field}` ? field : `-${field}`;
    setParams({ sort: next === '-paidAt' ? null : next });
  };

  const columns = useMemo<ColumnDef<TransactionDto>[]>(
    () => [
      {
        id: 'at',
        header: 'Date paid',
        enableHiding: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{dateTime(row.original.at)}</span>,
      },
      {
        id: 'customer',
        header: 'Customer',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-res-ink">{row.original.customerName}</p>
            <p className="type-res-caption text-res-ink-muted">#{row.original.shortId}</p>
          </div>
        ),
      },
      { id: 'source', header: 'Source', cell: ({ row }) => SOURCE_LABEL[row.original.source] ?? row.original.source },
      { id: 'provider', header: 'Channel', cell: ({ row }) => <ProviderBadge provider={row.original.provider} /> },
      { id: 'method', header: 'Method', cell: ({ row }) => methodLabel(row.original.method) },
      { id: 'status', header: 'Status', enableHiding: false, cell: ({ row }) => <StatusPill status={row.original.status} /> },
      {
        id: 'amount',
        header: 'Amount',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => formatMoney(row.original.amount, row.original.currency),
      },
      {
        id: 'fee',
        header: 'Fee',
        meta: { align: 'right' },
        cell: ({ row }) => formatMoney(row.original.transactionFee, row.original.currency),
      },
      {
        id: 'net',
        header: 'Net',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="font-semibold text-res-ink">{formatMoney(row.original.netToVendor, row.original.currency)}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pages,
    state: { sorting, columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row._id,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      await paymentService.exportTransactions(query);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export transactions'));
    } finally {
      setExporting(false);
    }
  };

  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);

  return (
    <ReportCard>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Search transactions</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-res-ink-muted" aria-hidden />
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search name, email or reference"
            className="type-res-small w-full rounded-full bg-res-surface py-2 pr-3 pl-9 text-res-ink outline-none placeholder:text-res-ink-muted focus-visible:ring-2 focus-visible:ring-res-brand"
          />
        </label>

        {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
          const selected = list(key);
          return (
            <DropdownMenu key={key}>
              <DropdownMenuTrigger
                className={`type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                  selected.length ? 'bg-res-secondary text-res-brand' : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                }`}
              >
                {FILTER_TITLES[key]}
                {selected.length > 0 && <span className="tabular-nums">· {selected.length}</span>}
                <ChevronDown className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{FILTER_TITLES[key]}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FILTERS[key].map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => toggleFilter(key, option.value)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {activeFilters && (
          <button
            type="button"
            onClick={() => {
              setQDraft('');
              setParams({ status: null, provider: null, source: null, q: null });
            }}
            className="type-res-small inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 font-medium text-res-ink-muted hover:text-res-ink"
          >
            <X className="size-4" aria-hidden /> Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Columns"
              className="type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-surface px-3 py-2 font-medium text-res-ink-muted outline-none hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand max-md:hidden"
            >
              <Columns3 className="size-4" aria-hidden /> Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {String(column.columnDef.header)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || !total}
            className="type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {q && q.length < 3 && (
        <p className="type-res-caption -mt-2 mb-3 text-res-ink-muted">Type at least 3 characters to search.</p>
      )}

      {result.isError && !result.data ? (
        <ErrorState message={errorMessage(result.error, "Couldn't load transactions.")} onRetry={() => result.refetch()} />
      ) : result.isLoading && !result.data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-res-sm" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState message={activeFilters ? 'No transactions match these filters.' : 'No transactions in this period.'} />
      ) : (
        <div className={result.isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id} className="border-res-line hover:bg-transparent">
                    {group.headers.map((header) => {
                      const right = (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right';
                      const sortable = header.column.id === 'at' || header.column.id === 'amount';
                      const state = sorting[0]?.id === header.column.id ? (sorting[0].desc ? 'desc' : 'asc') : null;
                      return (
                        <TableHead
                          key={header.id}
                          className={`type-res-caption text-res-ink-muted ${right ? 'text-right' : ''}`}
                          aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : undefined}
                        >
                          {sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(header.column.id as 'at' | 'amount')}
                              className={`inline-flex cursor-pointer items-center gap-1 hover:text-res-ink ${right ? 'flex-row-reverse' : ''}`}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {state === 'asc' && <ArrowUp className="size-3.5" aria-hidden />}
                              {state === 'desc' && <ArrowDown className="size-3.5" aria-hidden />}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setOpenId(row.original._id)}
                    className="cursor-pointer border-res-line hover:bg-res-surface"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const right = (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right';
                      return (
                        <TableCell
                          key={cell.id}
                          className={`type-res-small text-res-ink ${right ? 'text-right tabular-nums' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((row) => (
              <li key={row._id}>
                <button
                  type="button"
                  onClick={() => setOpenId(row._id)}
                  className="w-full cursor-pointer rounded-res-md bg-res-surface p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="type-res-small truncate font-semibold text-res-ink">{row.customerName}</p>
                      <p className="type-res-caption text-res-ink-muted">{dateTime(row.at)}</p>
                    </div>
                    <p className="type-res-body font-semibold text-res-ink tabular-nums">
                      {formatMoney(row.amount, row.currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill status={row.status} />
                    <ProviderBadge provider={row.provider} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-res-line pt-4">
          <p className="type-res-small text-res-ink-muted tabular-nums">
            Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-3">
            <label className="type-res-small flex items-center gap-2 text-res-ink-muted">
              Rows
              <select
                value={limit}
                onChange={(e) => setParams({ limit: e.target.value === '25' ? null : e.target.value })}
                className="type-res-small cursor-pointer rounded-full bg-res-surface px-3 py-1.5 text-res-ink outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setParams({ page: page - 1 > 1 ? String(page - 1) : null }, false)}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-res-surface text-res-ink hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="type-res-small px-2 text-res-ink tabular-nums">
                {page} / {pages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= pages}
                onClick={() => setParams({ page: String(page + 1) }, false)}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-res-surface text-res-ink hover:text-res-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentDetailsDialog paymentId={openId} onOpenChange={(open) => !open && setOpenId(null)} />
    </ReportCard>
  );
}
