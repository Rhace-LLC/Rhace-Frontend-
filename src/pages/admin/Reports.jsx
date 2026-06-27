import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  Calendar as CalendarIcon,
  Users,
  CreditCard,
  Building2,
  Receipt,
  Store,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  exportReservationsDirect,
  exportVendorEarningsDirect,
  exportPaymentsDirect,
  exportUsersDirect,
  exportVendorsDirect,
  getVendors,
} from '@/services/admin.service';

const extractArray = (p) => {
  if (Array.isArray(p)) return p;
  const candidates = [
    p?.data,
    p?.items,
    p?.results,
    p?.docs,
    p?.rows,
    p?.vendors,
    p?.list,
    p?.data?.data,
    p?.data?.items,
    p?.data?.results,
    p?.data?.docs,
    p?.data?.rows,
    p?.data?.vendors,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
};

const EXPORT_TYPES = [
  {
    value: 'reservations',
    label: 'Reservations',
    icon: <Receipt className="h-5 w-5" />,
    description: 'Export reservation data including guest info, dates, and payment status',
    requiresVendor: false,
  },
  {
    value: 'vendor-earnings',
    label: 'Vendor Earnings',
    icon: <CreditCard className="h-5 w-5" />,
    description: 'Export earnings data for a selected vendor',
    requiresVendor: true,
  },
  {
    value: 'payments',
    label: 'Payments',
    icon: <CreditCard className="h-5 w-5" />,
    description: 'Export payment transactions with amounts and status',
    requiresVendor: false,
  },
  {
    value: 'users',
    label: 'Users',
    icon: <Users className="h-5 w-5" />,
    description: 'Export user accounts with roles and activity status',
    requiresVendor: false,
  },
  {
    value: 'vendors',
    label: 'Vendors',
    icon: <Building2 className="h-5 w-5" />,
    description: 'Export vendor profiles with business details',
    requiresVendor: false,
  },
];

export default function Reports() {
  const [selectedExportType, setSelectedExportType] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [vendors, setVendors] = useState([]);
  const [progressText, setProgressText] = useState('');

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await getVendors({ limit: 1000 });
        const vendorData = extractArray(response.data);
        setVendors(vendorData);
      } catch (error) {
        console.error('Failed to fetch vendors', error);
      }
    };
    fetchVendors();
  }, []);

  const getExportTypeConfig = () => {
    return EXPORT_TYPES.find((t) => t.value === selectedExportType);
  };

  const currentExportType = getExportTypeConfig();

  const handleExport = async () => {
    if (!selectedExportType) {
      toast.error('Please select an export type');
      return;
    }

    const typeConfig = getExportTypeConfig();
    if (typeConfig?.requiresVendor && !selectedVendor) {
      toast.error('Please select a vendor for this export');
      return;
    }

    try {
      setExporting(true);
      setProgressText(`Generating ${typeConfig?.label} report...`);

      const params = {
        format: exportFormat,
      };

      // Add vendor filter if selected
      if (selectedVendor) {
        params.vendorId = selectedVendor;
      }

      // Add date range if selected
      if (dateRange?.from) {
        params.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        params.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }

      // Add status filter if applicable
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      // Call the appropriate export function
      let response;
      switch (selectedExportType) {
        case 'reservations':
          response = await exportReservationsDirect(params);
          break;
        case 'vendor-earnings':
          response = await exportVendorEarningsDirect(params);
          break;
        case 'payments':
          response = await exportPaymentsDirect(params);
          break;
        case 'users':
          response = await exportUsersDirect(params);
          break;
        case 'vendors':
          response = await exportVendorsDirect(params);
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Validate response
      if (!response.data || response.data.size === 0) {
        throw new Error('Empty file received from server');
      }

      // Determine content type and file extension
      const contentType = exportFormat === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
      const extension = exportFormat === 'xlsx' ? 'xlsx' : 'csv';

      // Trigger download
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedExportType}-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${typeConfig?.label} report downloaded successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      let errorMessage = 'Export failed';
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid parameters';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(`Failed to export ${typeConfig?.label}: ${errorMessage}`);
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  const getStatusOptions = () => {
    switch (selectedExportType) {
      case 'reservations':
        return ['confirmed', 'cancelled', 'pending', 'checked-in', 'checked-out'];
      case 'payments':
        return ['succeeded', 'failed', 'pending', 'refunded'];
      case 'users':
        return ['active', 'inactive'];
      case 'vendors':
        return ['active', 'pending', 'suspended'];
      default:
        return [];
    }
  };

  const statusOptions = getStatusOptions();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
      </div>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Export Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {EXPORT_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={selectedExportType === type.value ? 'default' : 'outline'}
                className="h-auto flex-col py-4 gap-2"
                onClick={() => {
                  setSelectedExportType(type.value);
                  if (!type.requiresVendor && selectedVendor) {
                    setSelectedVendor('');
                  }
                }}
              >
                {type.icon}
                <span className="text-sm font-medium">{type.label}</span>
              </Button>
            ))}
          </div>

          {/* Filters Section */}
          {selectedExportType && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Filters (all optional)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vendor Select (shown for types that support it) */}
                {currentExportType && (
                  <div className="space-y-2">
                    <Label htmlFor="vendor-select">
                      Vendor
                      {currentExportType.requiresVendor && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger id="vendor-select">
                        <SelectValue
                          placeholder={
                            currentExportType.requiresVendor
                              ? 'Select a vendor'
                              : 'All vendors'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!currentExportType.requiresVendor && (
                          <SelectItem value="">All Vendors</SelectItem>
                        )}
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor._id} value={vendor._id}>
                            {vendor.businessName || vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange?.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'MMM dd, y')} -{' '}
                              {format(dateRange.to, 'MMM dd, y')}
                            </>
                          ) : (
                            format(dateRange.from, 'MMM dd, y')
                          )
                        ) : (
                          <span>All dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from || new Date()}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status Filter */}
                {statusOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Export Format */}
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  size="lg"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {progressText || 'Exporting...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export {currentExportType?.label || 'Data'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* No selection state */}
          {!selectedExportType && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select an export type above to begin</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a data type, apply optional filters, and download instantly
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary / Info Card */}
      {selectedExportType && currentExportType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              About this export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{currentExportType.description}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Format: <strong>{exportFormat.toUpperCase()}</strong>
              </span>
              <span>
                Vendor filter:{' '}
                <strong>
                  {selectedVendor
                    ? vendors.find((v) => v._id === selectedVendor)?.businessName || 'Selected'
                    : 'All'}
                </strong>
              </span>
              <span>
                Date range:{' '}
                <strong>
                  {dateRange?.from
                    ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to || dateRange.from, 'MMM dd')}`
                    : 'All time'}
                </strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}