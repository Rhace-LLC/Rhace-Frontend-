import { StatCard } from '@/components/dashboard/stats/mainStats';
import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import { Calendar, Cash2, Eye, EyeClose, Group3 } from '@/components/dashboard/ui/svg';
import { useAuth } from '@/contexts/AuthContext';
import NoDataFallback from '@/components/NoDataFallback';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { clubService } from '@/services/club.service';
import { ChevronDown, ChevronLeft, ChevronRight, Edit, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AddTablesModal } from './components/AddTablesModal';

const Cash2Icon = (props: any) => <Cash2 {...props} />;

const normalizeStatus = (status = '') => {
  const s = status?.toLowerCase() || '';
  if (s === 'active' || s === 'available') return 'Active';
  if (s === 'inactive' || s === 'unavailable') return 'Inactive';
  if (s === 'out of stock') return 'Out of Stock';
  if (s === 'low stock') return 'Low Stock';
  return 'Active';
};

const statusOptions = ['all', 'Active', 'Inactive', 'Out of Stock', 'Low Stock'];

export default function ManageTables() {
  const [tables, setTables] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [initialTableData, setInitialTableData] = useState<any>(null);
  const [hideTab, setHideTab] = useState(false);
  const { vendor } = useAuth();

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const data = await clubService.getTables(vendor._id);
      setTables(data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?._id]);

  const filteredTables = tables.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || normalizeStatus(item.status) === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredTables.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setTotalItems(filteredTables.length);
    const maxPage = Math.max(1, Math.ceil(filteredTables.length / itemsPerPage));
    setCurrentPage((prev) => Math.min(prev, maxPage));
  }, [filteredTables.length, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 3;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > maxVisible) pages.push('ellipsis-start');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - maxVisible + 1) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  };

  const getStatusColor = (status: any) => {
    switch (normalizeStatus(status)) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Out of Stock':
        return 'bg-red-100 text-red-800';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <UniversalLoader type="dashboard-3" />;
  }

  const activeTables = tables.filter((t) => normalizeStatus(t.status) === 'Active').length;
  const totalValue = tables.reduce((sum, t) => sum + (t.price || 0), 0);

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-2 md:p-6 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="md:flex justify-between items-center mb-6">
            <h2 className="text-[#111827] font-semibold mb-2">Tables Management</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-2 gap-2 md:gap-6">
              <DashboardButton
                onClick={() => setHideTab(!hideTab)}
                variant="secondary"
                text={hideTab ? 'Open tabs' : 'Hide tabs'}
                icon={hideTab ? <Eye /> : <EyeClose />}
              />
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors"
              >
                <Plus size={18} />
                <span>Add New Table</span>
              </button>
            </div>
          </div>

          {!hideTab && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 mb-8 rounded-lg bg-white border border-gray-200 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
              <div className="flex-1">
                <StatCard
                  title="Total Tables"
                  value={tables.length}
                  change={0}
                  color="blue"
                  icon={<Calendar />}
                />
              </div>
              <div className="flex-1">
                <StatCard
                  title="Active Tables"
                  value={activeTables}
                  change={0}
                  color="purple"
                  icon={<Group3 />}
                />
              </div>
              <div className="flex-1">
                <StatCard
                  title="Total Value"
                  value={`₦${totalValue.toLocaleString()}`}
                  change={0}
                  color="orange"
                  icon={<Cash2Icon fill="#E1B505" />}
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex md:items-center flex-col-reverse md:flex-row gap-4 justify-between py-4 px-4 border-b border-gray-200">
              <div className="flex flex-1 items-center" />
              <div className="flex items-center justify-between gap-4">
                <div className="relative items-center flex flex-1">
                  <Search className="absolute left-2 text-[#606368] size-5" />
                  <Input
                    type="text"
                    placeholder="Search tables"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm pl-10 bg-[#F9FAFB] border-[#DAE9E9]"
                  />
                </div>
                <div className="md:flex gap-2 hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-auto text-[#606368]">
                        {selectedStatus === 'all' ? 'Status' : selectedStatus} <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="p-2">
                        {statusOptions.map((status) => (
                          <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                              selectedStatus === status ? 'bg-gray-100 font-medium' : ''
                            }`}
                          >
                            {status === 'all' ? 'All Status' : status}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {paginatedItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price (₦)
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seating
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AddOns
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-12 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedItems.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            ID: #{item._id?.slice(0, 8) || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.category}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          ₦{(item.price || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {item.seatingCapacity || 0}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-1 items-center">
                            {item.addOns?.slice(0, 2).map((addOn: any, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {addOn}
                              </span>
                            ))}
                            {item.addOns?.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{item.addOns.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {normalizeStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => {
                              setInitialTableData(item);
                              setShowEditModal(true);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoDataFallback />
            )}
          </div>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="absolute hidden md:flex bottom-0 border-t border-[#E5E7EB] left-0 right-0 bg-white">
          <div className="flex items-center w-full px-8 justify-between space-x-2 py-4">
            <div className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages} ({totalItems} total items)
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

      {showModal && (
        <AddTablesModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchTables();
            setShowModal(false);
          }}
        />
      )}
      {showEditModal && (
        <AddTablesModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchTables();
            setShowEditModal(false);
          }}
          initialData={initialTableData}
          editMode={true}
        />
      )}
    </>
  );
}
