import { StatCard } from '@/components/dashboard/stats/mainStats';
import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import {
  Add,
  Calendar,
  CardPay,
  Cash2,
  CheckCircle,
  Copy,
  Export,
  Eye,
  Eye2,
  EyeClose,
  Filter2,
  Group3,
  Pencil,
  Phone,
  Printer,
  XCircle,
} from '@/components/dashboard/ui/svg';
import { useAuth } from '@/contexts/AuthContext';

import BookingOverviewVendorPOV from '@/components/BookingOverviewVendorPOV';
import NoDataFallback from '@/components/NoDataFallback';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ConfirmReservation, {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { userService } from '@/services/user.service';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MoreVertical,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import RecordOfflinePaymentModal from '@/pages/vendor/shared/payments/RecordOfflinePayment';

const Cash2Icon = (props: any) => <Cash2 {...props} />;
const AddIcon = (props: any) => <Add {...props} />;
const XCircleIcon = (props: any) => <XCircle {...props} />;
const Eye2Icon = (props: any) => <Eye2 {...props} />;
const CheckCircleIcon = (props: any) => <CheckCircle {...props} />;

const normalizePaymentStatus = (status = '', payLater = false): string => {
  const s = status?.toLowerCase() || '';

  if (s === 'paid' || s === 'success') return 'Fully Paid';
  if (s === 'partly_paid') return 'Partly Paid';
  if (payLater) return 'Pay Later';
  if (s.includes('refunded')) return 'Refunded';
  if (s.includes('unpaid') || s.includes('not_paid')) return 'Unpaid';

  return 'Pending';
};

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper function to calculate total quantity of drinks
const calculateTotalDrinksQuantity = (reservation: any) => {
  if (!reservation.drinks || !Array.isArray(reservation.drinks)) return 0;

  return reservation.drinks.reduce((total: number, item: any) => {
    return total + (item.quantity || 0);
  }, 0);
};

interface Stat {
  count: number;
  change: number;
}

const ClubReservationTable = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedReservations, setSelectedReservations] = useState<any[]>([]);
  const { vendor } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<{ [key: string]: Stat }>({
    totalReservations: { count: 0, change: 0 },
    prepaidReservations: { count: 0, change: 0 },
    expectedGuests: { count: 0, change: 0 },
    pendingPayments: { count: 0, change: 0 },
  });
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedTable, setSelectedTable] = useState('all');
  const [resID, setResID] = useState<string | undefined>();

  const [hideTab, setHideTab] = useState(false);
  const [showPopup, setShowPopup] = useState<{ display: boolean; bookingId: any }>({
    display: false,
    bookingId: null,
  });
  const [offlinePaymentOpen, setOfflinePaymentOpen] = useState(false);
  const [rowOfflinePaymentId, setRowOfflinePaymentId] = useState<string | null>(null);
  const handleOpenOfflinePayment = () => setOfflinePaymentOpen(true);
  const handleCloseOfflinePayment = () => setOfflinePaymentOpen(false);

  const navigate = useNavigate();

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 3;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > maxVisible) {
        pages.push('ellipsis-start');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - maxVisible + 1) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const tabs = ['All', 'Upcoming', 'Completed', 'Canceled', 'No Shows'];

  const handleSelectReservation = (id: any, checked: boolean) => {
    if (checked) {
      setSelectedReservations([...selectedReservations, id]);
    } else {
      setSelectedReservations(selectedReservations.filter((reservationId) => reservationId !== id));
    }
  };

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!vendor?._id) return;

    const connect = () => {
      const socket = new WebSocket(
        `wss://rhace-backend-mkne.onrender.com?type=vendor&id=${vendor._id}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📩 Message from server:', message);

          if (message.type === 'new_reservation') {
            toast.success(`🆕 New reservation from ${message.data.customerName}`);
            setReservations((prev) => [...prev, message.data]);
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      };

      socket.onerror = (err) => {
        console.error('⚠️ WebSocket error:', err);
      };

      socket.onclose = (e) => {
        console.warn(`🔌 WebSocket closed (code: ${e.code})`);
        socketRef.current = null;

        if (e.code !== 1000) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('🔁 Reconnecting WebSocket...');
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [vendor?._id]);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        console.log('Fetching reservations for vendor:', vendor._id);
        const res = await userService.fetchReservations({
          vendorId: vendor._id,
        });
        setReservations(res.data || []);
      } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Failed to fetch reservations');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await userService.fetchReservationsStats();
        setStats(res.data || {});
      } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Failed to fetch stats');
      }
    };

    fetchReservations();
    fetchStats();
  }, [vendor?._id]);

  // Calculate stats from reservations
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalReservations = reservations.length;

    const prepaidReservations = reservations.filter(
      (res) => normalizePaymentStatus(res.paymentStatus, res.payLater) === 'Fully Paid'
    ).length;

    const todayReservations = reservations.filter((res) => {
      const resDate = new Date(res.date);
      resDate.setHours(0, 0, 0, 0);
      return resDate.getTime() === today.getTime();
    });

    const expectedGuestsToday = todayReservations.reduce((sum, res) => sum + (res.guests || 0), 0);

    const pendingPayments = reservations
      .filter(
        (res) =>
          normalizePaymentStatus(res.paymentStatus, res.payLater) === 'Unpaid' ||
          normalizePaymentStatus(res.paymentStatus, res.payLater) === 'Partly Paid' ||
          normalizePaymentStatus(res.paymentStatus, res.payLater) === 'Pay Later'
      )
      .reduce((sum, res) => sum + (res.totalAmount || 0), 0);

    setStats({
      totalReservations: { count: totalReservations, change: 0 },
      prepaidReservations: { count: prepaidReservations, change: 0 },
      expectedGuests: { count: expectedGuestsToday, change: 0 },
      pendingPayments: { count: pendingPayments, change: 0 },
    });
  }, [reservations]);

  // Filter reservations based on search term and active tab
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      !searchTerm ||
      reservation.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.vendor?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (activeTab !== 'All') {
      const status = (reservation.reservationStatus || reservation.status || '').toLowerCase();

      switch (activeTab) {
        case 'Upcoming':
          matchesTab = status === 'upcoming';
          break;
        case 'Completed':
          matchesTab = status === 'completed' || status === 'paid';
          break;
        case 'Canceled':
          matchesTab = status === 'canceled' || status === 'cancelled';
          break;
        case 'No Shows':
          matchesTab = status === 'no shows' || status === 'no-shows';
          break;
        default:
          matchesTab = true;
      }
    }

    const matchesPaymentStatus =
      selectedPaymentStatus === 'all' ||
      normalizePaymentStatus(reservation.paymentStatus, reservation.payLater) === selectedPaymentStatus;

    const matchesTable = selectedTable === 'all' || reservation.table === selectedTable;

    let matchesDate = true;
    if (selectedDate !== 'all') {
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate === 'Today') {
        reservationDate.setHours(0, 0, 0, 0);
        matchesDate = reservationDate.getTime() === today.getTime();
      }

      if (selectedDate === 'This Week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        matchesDate = reservationDate >= weekStart && reservationDate <= weekEnd;
      }

      if (selectedDate === 'This Month') {
        matchesDate =
          reservationDate.getMonth() === today.getMonth() &&
          reservationDate.getFullYear() === today.getFullYear();
      }

      if (selectedDate === 'Last 30 Days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = reservationDate >= thirtyDaysAgo;
      }
    }

    return matchesSearch && matchesTab && matchesPaymentStatus && matchesTable && matchesDate;
  });

  const data = filteredReservations;

  const reservationStatusOptions = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-[#E7F0F0] text-[#0A6C6D] border-[#B3D1D2]';
      case 'confirmed':
        return 'bg-[#D1FAE5] text-[#37703F] border-[#B8FFC2]';
      case 'canceled':
        return 'bg-[#FCE6E6] text-[#EF4444] border-[#FAE48A]';
      case 'no-show':
        return 'bg-[#FCE6E6] text-[#EF4444] border-[#FAE48A]';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Update total items based on filtered reservations
  useEffect(() => {
    setTotalItems(filteredReservations.length);
    const maxPage = Math.max(1, Math.ceil(filteredReservations.length / itemsPerPage));
    setCurrentPage((prev) => Math.min(prev, maxPage));
  }, [filteredReservations.length, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedDate, selectedPaymentStatus, selectedTable]);

  // compute paginated reservations for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReservations = data.slice(startIndex, startIndex + itemsPerPage);

  // Toggle selection for visible page items
  const handleToggleSelectPage = (checked: boolean) => {
    const pageIds = paginatedReservations.map((r) => r._id);
    if (checked) {
      setSelectedReservations((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedReservations((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const getPaymentStatusColor = (status: any) => {
    switch (normalizePaymentStatus(status)) {
      case 'Fully Paid':
        return 'bg-[#D1FAE5] text-[#37703F]';
      case 'Part Paid':
        return 'bg-[#FEF3C7] text-[#92400E]';
      case 'Unpaid':
        return 'bg-gray-100 text-gray-800';
      case 'Pay Later':
        return 'bg-blue-100 text-blue-800';
      case 'Refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <UniversalLoader type="dashboard-2" />;
  }

  return (
    <>
          <div className="min-h-screen bg-gray0 p-2 md:p-6 mb-12">
            <div className="max-w-7xl mx-auto">
              <div className="md:flex justify-between items-center mb-6">
                <h2 className="text-[#111827] mb-2 font-semibold">Club Reservation Management</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-6">
                  <DashboardButton
                    onClick={() => setHideTab(!hideTab)}
                    variant="secondary"
                    text={hideTab ? 'Open tabs' : 'Hide tabs'}
                    icon={hideTab ? <Eye /> : <EyeClose />}
                  />
                  <DashboardButton variant="secondary" text="Export" icon={<Export />} />
                  <DashboardButton
                    onClick={handleOpenOfflinePayment}
                    variant="secondary"
                    text="Record Offline Payment"
                    icon={<Cash2Icon fill="black" />}
                  />
                  <DashboardButton
                    onClick={() => navigate('/dashboard/club/reservation/new')}
                    variant="primary"
                    text="New Reservation"
                    icon={<AddIcon fill="#fff" />}
                  />
                </div>
              </div>
              {!hideTab && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 mb-8 rounded-lg bg-white border border-gray-200">
                  <div className="flex-1">
                    <StatCard
                      title="Total Reservations"
                      value={stats.totalReservations.count}
                      change={stats.totalReservations.change}
                      color="blue"
                      icon={<Calendar />}
                    />
                  </div>
                  <div className="flex-1">
                    <StatCard
                      title="Prepaid Reservations"
                      value={stats.prepaidReservations.count}
                      change={stats.prepaidReservations.change}
                      color="green"
                      icon={<CardPay />}
                    />
                  </div>
                  <div className="flex-1">
                    <StatCard
                      title="Expected Guests Today"
                      value={stats.expectedGuests.count}
                      change={stats.expectedGuests.change}
                      color="purple"
                      icon={<Group3 />}
                    />
                  </div>
                  <div className="flex-1">
                    <StatCard
                      title="Pending Payments"
                      value={`₦${stats.pendingPayments.count.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`}
                      change={stats.pendingPayments.change}
                      color="orange"
                      icon={<Cash2Icon fill="#E1B505" />}
                    />
                  </div>
                </div>
              )}

              {/* Tabs and Filters */}
              <div className="bg-white rounded-g borde border-gray-0">
                <div className="flex md:items-center flex-col-reverse md:flex-row gap-4 justify-between py-4 px-4 border- border-gray-200">
                  <div className="flex flex-1 items-center">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`p-2 text-xs md:text-sm rounded-lg border font-medium cursor-pointer ${
                          activeTab === tab
                            ? 'border-[#B3D1D2] bg-[#E7F0F0] text-[#111827]'
                            : 'border-transparent text-[#606368]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative items-center flex flex-1">
                      <Search className="absolute left-2 text-[#606368] size-5" />
                      <Input
                        type="text"
                        placeholder="Search by guest name, ID, booking code or venue"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm pl-10 bg-[#F9FAFB] border-[#DAE9E9]"
                      />
                    </div>
                    <div className="md:flex gap-2 hidden">
                      {/* Date Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="ml-auto text-[#606368]">
                            {selectedDate === 'all' ? 'Date' : selectedDate} <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <div className="p-2">
                            <button
                              onClick={() => setSelectedDate('all')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedDate === 'all' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              All Dates
                            </button>
                            <button
                              onClick={() => setSelectedDate('Today')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedDate === 'Today' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              Today
                            </button>
                            <button
                              onClick={() => setSelectedDate('This Week')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedDate === 'This Week' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              This Week
                            </button>
                            <button
                              onClick={() => setSelectedDate('This Month')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedDate === 'This Month' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              This Month
                            </button>
                            <button
                              onClick={() => setSelectedDate('Last 30 Days')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedDate === 'Last 30 Days' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              Last 30 Days
                            </button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Payment Status Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="ml-auto text-[#606368]">
                            {selectedPaymentStatus === 'all'
                              ? 'Payment Status'
                              : selectedPaymentStatus}{' '}
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <div className="p-2">
                            <button
                              onClick={() => setSelectedPaymentStatus('all')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedPaymentStatus === 'all' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              All Status
                            </button>
                            <button
                              onClick={() => setSelectedPaymentStatus('Fully Paid')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedPaymentStatus === 'Fully Paid'
                                  ? 'bg-gray-100 font-medium'
                                  : ''
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Fully Paid
                              </span>
                            </button>
                            <button
                              onClick={() => setSelectedPaymentStatus('Part Paid')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedPaymentStatus === 'Part Paid'
                                  ? 'bg-gray-100 font-medium'
                                  : ''
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                Partly Paid
                              </span>
                            </button>
                            <button
                              onClick={() => setSelectedPaymentStatus('Unpaid')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedPaymentStatus === 'Unpaid' ? 'bg-gray-100 font-medium' : ''
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                Unpaid
                              </span>
                            </button>
                            <button
                              onClick={() => setSelectedPaymentStatus('Refunded')}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                                selectedPaymentStatus === 'Refunded'
                                  ? 'bg-gray-100 font-medium'
                                  : ''
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Refunded
                              </span>
                            </button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Advanced Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="ml-auto text-[#606368]">
                            Advanced filter <Filter2 fill="black" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Table
                              </label>
                              <select
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                <option value="all">All Tables</option>
                                {Array.from(
                                  new Set(reservations.map((r) => r.table).filter(Boolean))
                                ).map((table) => (
                                  <option key={table as any} value={table as any}>
                                    {table as any}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Guest Count
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  placeholder="Min"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                  type="number"
                                  placeholder="Max"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <button
                                onClick={() => {
                                  setSelectedDate('all');
                                  setSelectedPaymentStatus('all');
                                  setSelectedTable('all');
                                }}
                                className="w-full px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-md font-medium"
                              >
                                Clear All Filters
                              </button>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="md:hidden">
                      <Button variant="outline" size="sm" className="ml-auto">
                        <Filter2 fill="black" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                {data.length > 0 ? (
                  <div className="overflow-hidden hidden md:block rounded-md border">
                    <Table>
                      <TableHeader className="bg-[#E6F2F2]">
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={
                                paginatedReservations.length > 0 &&
                                paginatedReservations.every((r) =>
                                  selectedReservations.includes(r._id)
                                )
                              }
                              onChange={(e) => handleToggleSelectPage(e.target.checked)}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              disabled={paginatedReservations.length === 0}
                            />
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer name
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Guests
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Table
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Items
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total (₦)
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Status
                          </TableHead>
                          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reservation Status
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReservations.length > 0 ? (
                          paginatedReservations.map((reservation) => (
                            <TableRow
                              key={reservation._id}
                              className="hover:bg-gray-50"
                              data-state={selectedReservations.includes(reservation._id) && 'selected'}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedReservations.includes(reservation._id)}
                                  onChange={(e) =>
                                    handleSelectReservation(reservation._id, e.target.checked)
                                  }
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>
                                      {reservation.customerName
                                        ?.split(' ')
                                        .map((i: any) => i.slice(0, 1).toUpperCase()) || 'N/A'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {reservation.customerName || 'Unknown'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      ID: #{reservation._id?.slice(0, 8) || 'N/A'}
                                      <div className="text-xs">{reservation.bookingCode}</div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm text-gray-900">
                                    {formatDate(reservation.date) || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {reservation.time || 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {/* <Users className="w-4 h-4 text-gray-400" /> */}
                                  <span className="text-sm text-gray-900">
                                    {reservation.guests || 0}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 items-center">
                                  <div className="text-sm text-gray-900 space-y-0.5">
                                    {reservation.tables
                                      ? reservation.tables.slice(0, 2).map((t: any, i: number) => (
                                          <div key={i} className="mr-2">
                                            {t.tableType.name}
                                          </div>
                                        ))
                                      : 'Not Assigned'}
                                  </div>
                                  {reservation.tables && reservation.tables.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{reservation.tables.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-600">
                                    Combos: {reservation.combos?.length || 0}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Drinks: {calculateTotalDrinksQuantity(reservation)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-900 font-medium">
                                  ₦{reservation.totalAmount?.toLocaleString() || '0'}
                                </span>
                              </TableCell>
                               <TableCell>
                                 <div
                                   className={` w-max ${getPaymentStatusColor(reservation.paymentStatus)} flex py-1.5 px-3 border rounded-full`}
                                 >
                                   {normalizePaymentStatus(reservation.paymentStatus, reservation.payLater)}
                                 </div>
                               </TableCell>
                              <TableCell>
                                <div
                                  className={`w-max 
                                  ${reservationStatusOptions(reservation.reservationStatus)} 
                                    flex py-1.5 px-3 border rounded-full`}
                                >
                                  {reservation.reservationStatus === 'upcoming' && 'Upcoming'}
                                  {reservation.reservationStatus === 'confirmed' && 'Confirmed'}
                                  {reservation.reservationStatus === 'canceled' && 'Canceled'}
                                  {reservation.reservationStatus === 'no-show' && 'No Show'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {/* <button
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() =>
                                setShowPopup({
                                  display: true,
                                  details: reservation,
                                })
                              }
                            >
                              <Eye size={16} />
                            </button> */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreVertical />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {/* <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              Copy payment ID
            </DropdownMenuItem> */}
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setShowPopup({
                                            display: true,
                                            bookingId: reservation._id,
                                          })
                                        }
                                      >
                                        <Eye2Icon /> View Reservation
                                      </DropdownMenuItem>
                                      {['Partly Paid', 'Pay Later', 'Unpaid'].includes(normalizePaymentStatus(reservation.paymentStatus, reservation.payLater)) && (
                                        <DropdownMenuItem
                                          onClick={() => setRowOfflinePaymentId(reservation._id)}
                                        >
                                          <Cash2Icon /> Record Offline Payment
                                        </DropdownMenuItem>
                                      )}
                                    <DropdownMenuItem>
                                      <span
                                        className="relative flex cursor-pointer items-center gap-2 rounded-sm  py-1.5"
                                        onClick={() => {
                                          setOpen(true);
                                          setResID(reservation._id);
                                          console.log(resID);
                                        }}
                                      >
                                        <CheckCircleIcon /> Mark as Completed
                                      </span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center">
                              No reservations found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <NoDataFallback />
                )}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="absolute hidden md:flex bottom-0 border-t border-[#E5E7EB] left-0 right-0 bg-white">
              <div className="flex items-center w-full px-8 justify-between space-x-2 py-4">
                <div className="text-muted-foreground text-sm">
                  Page {currentPage} of {totalPages} ({totalItems} total reservations)
                </div>
                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, idx) => (
                    <button
                      key={idx}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === 'ellipsis-start' || page === 'ellipsis-end'}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-200'
                      } ${
                        page === 'ellipsis-start' || page === 'ellipsis-end'
                          ? 'cursor-default'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page === 'ellipsis-start' || page === 'ellipsis-end' ? '…' : page}
                    </button>
                  ))}
                </div>
                <div className="gap-2 flex">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-2 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popup Modal */}
          {showPopup.display && (
            <div className="inset-0 fixed top-0 left-0 w-full h-screen overflow-y-auto bg-black/80 z-50">
              <div className="bg-white px-4 max-w-4xl mx-auto rounded-lg my-10 py-6 md:px-6 md:py-8 relative">
                <button
                  onClick={() => setShowPopup({ display: false, bookingId: null })}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon size={24} />
                </button>
                {showPopup.bookingId && (
                  <BookingOverviewVendorPOV bookingId={showPopup.bookingId} />
                )}
              </div>
            </div>
          )}
          <RecordOfflinePaymentModal
            isOpen={offlinePaymentOpen}
            onClose={handleCloseOfflinePayment}
            onSuccess={() => toast.success('Offline payment recorded successfully')}
          />

          <RecordOfflinePaymentModal
            isOpen={!!rowOfflinePaymentId}
            reservationId={rowOfflinePaymentId ?? undefined}
            onClose={() => setRowOfflinePaymentId(null)}
            onSuccess={() => {
              toast.success('Offline payment recorded successfully');
              setRowOfflinePaymentId(null);
            }}
          />

          <ConfirmReservation
            onConfirm={async () => {
              if (!vendor?._id) {
                toast.error('Vendor information missing. Please refresh the page.');
                return;
              }

              try {
                await userService.updateReservationStatus({
                  reservationId: resID,
                  vendorId: vendor._id,
                });
                toast.success('Reservation marked as complete!');
                // Refresh reservations list
                const freshRes = await userService.fetchReservations({
                  vendorId: vendor._id,
                });
                setReservations(freshRes.data || []);
              } catch (error: any) {
                console.error('Update failed:', error);
                toast.error(error.response?.data?.message || 'Failed to update reservation');
              }
            }}
            setOpen={setOpen}
            open={open}
          />
        </>
    );
};

export default ClubReservationTable;