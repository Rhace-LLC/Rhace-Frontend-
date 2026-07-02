import { useEffect, useMemo, useState } from 'react';
import { paymentService } from '@/services/payment.service';
import { toast } from 'react-toastify';
import { formatDate } from '@/utils/formatDate';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Search,
  ChevronDown,
  MoreVertical,
  Eye,
  Filter,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import PaymentDetailsDialog from "./PaymentDetailDialog";

const PaymentTransactionHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments();
      setData(res);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (payment) => {
    const status = (
      payment?.paymentStatus ||
      payment?.payment_status ||
      payment?.status ||
      ''
    )
      .toLowerCase()
      .trim();

    if (!status) return 'Pending';
    if (['success', 'paid', 'completed'].includes(status)) return 'Success';
    if (['pending', 'processing'].includes(status)) return 'Pending';
    if (['failed', 'cancelled'].includes(status)) return 'Failed';

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const uniqueStatuses = useMemo(
    () => [...new Set(data.map((item) => getPaymentStatus(item)))],
    [data]
  );

  const uniqueDates = useMemo(
    () => [...new Set(data.map((item) => formatDate(item.createdAt)))],
    [data]
  );

  const columns = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span>{formatDate(row.original.createdAt)}</span>
      ),
      filterFn: (row, id, value) =>
        value === '' || formatDate(row.original.createdAt) === value,
    },

    {
      accessorKey: 'transaction',
      header: 'Transaction ID',
      cell: ({ row }) => (
        <span>#{row.original._id.slice(0, 8).toUpperCase()}</span>
      ),
    },

    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {row.original.customerName
                ?.split(' ')
                .map((x) => x[0])
                .join('')}
            </AvatarFallback>
          </Avatar>

          <span>{row.original.customerName}</span>
        </div>
      ),
    },

    {
      accessorKey: 'paymentMethod',
      header: 'Method',
      cell: ({ row }) => (
        <span>
          {row.original.paymentMethod
            ?.replaceAll('_', ' ')
            ?.toUpperCase()}
        </span>
      ),
    },

    {
      accessorKey: 'amountPaid',
      header: 'Amount',
      cell: ({ row }) => (
        <span>
          ₦{(row.original.amountPaid || 0).toLocaleString()}
        </span>
      ),
    },

    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: (row, id, value) =>
        value === '' || getPaymentStatus(row.original) === value,
      cell: ({ row }) => {
        const status = getPaymentStatus(row.original);
        const success = status === 'Success';

        return (
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs
            ${
              success
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-yellow-100 border-yellow-300 text-yellow-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                success ? 'bg-green-600' : 'bg-yellow-600'
              }`}
            />

            {status}
          </div>
        );
      },
    },

    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedPayment(row.original);
                setDetailsOpen(true);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, id, value) =>
      row.original.customerName
        ?.toLowerCase()
        .includes(value.toLowerCase()),
  });

  return (
    <>
      <div className="w-full rounded-2xl border bg-white overflow-hidden">

        <div className="flex flex-col md:flex-row gap-4 justify-between p-5">

          <h2 className="text-lg font-semibold">
            Transaction History
          </h2>

          <div className="flex gap-3 flex-wrap">

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-10"
                placeholder="Search customer..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Date
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>

                <DropdownMenuRadioGroup
                  value={dateFilter}
                  onValueChange={(value) => {
                    setDateFilter(value);

                    table.setColumnFilters((old) => [
                      ...old.filter((i) => i.id !== 'date'),
                      { id: 'date', value },
                    ]);
                  }}
                >
                  <DropdownMenuRadioItem value="">
                    All Dates
                  </DropdownMenuRadioItem>

                  {uniqueDates.map((date) => (
                    <DropdownMenuRadioItem
                      key={date}
                      value={date}
                    >
                      {date}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Status
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>

                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);

                    table.setColumnFilters((old) => [
                      ...old.filter((i) => i.id !== 'status'),
                      { id: 'status', value },
                    ]);
                  }}
                >
                  <DropdownMenuRadioItem value="">
                    All Statuses
                  </DropdownMenuRadioItem>

                  {uniqueStatuses.map((status) => (
                    <DropdownMenuRadioItem
                      key={status}
                      value={status}
                    >
                      {status}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        <Table>

          <TableHeader className="bg-[#E6F2F2]">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>

            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-10"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-10"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}

          </TableBody>

        </Table>
      </div>

      <PaymentDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        payment={selectedPayment}
      />
    </>
  );
};

export default PaymentTransactionHistory;