// HotelSettings.tsx

import TagInput from '@/components/TagInput';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Clock,
  DollarSign,
  Tag,
  Save,
  RotateCcw,
  Briefcase,
  Coffee,
  Wifi,
  ParkingCircle,
  Dog,
  Users,
  Ban,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { authService } from '@/services/auth.service';
import type { RootState, AppDispatch } from '@/redux/store';
import { PaymentSettingsLink } from '@/pages/vendor/shared/payments/components/PaymentSettingsLink';

const HotelSettings = () => {
  const { vendor, setVendor } = useAuth();
  const [formData, setFormData] = useState<any>(vendor);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const user = await authService.vendorUpdate(formData);
      setVendor(user?.vendor);
      toast.success('Successfully updated hotel settings!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(vendor);
    toast.info('Changes have been reset');
  };

  return (
    <div className="min-h-screen">
        <div className="px-4 py-8 md:px-6 lg:px-8">
          {/* Header Section */}
          <DashboardPageHeader
            title="Hotel Settings"
            subtitle="Manage your hotel profile, amenities, pricing, and booking preferences"
          />

          <div className="grid gap-6 mt-6">
            {/* Business Information Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <Building2 className="w-5 h-5 text-res-brand" />
                    </span>
                    Business Information
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Hotel details</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    placeholder="Hotel Name"
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>

                <Input
                  placeholder="https://yourhotel.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                />

                <div className="space-y-6">
                  <Textarea
                    placeholder="Describe your hotel's unique features, ambiance, and what makes it special..."
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all min-h-[100px]"
                  />
                  <Textarea
                    placeholder="Enter your hotel's complete address..."
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Amenities Card - Optional section for hotels */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <Briefcase className="w-5 h-5 text-res-brand" />
                    </span>
                    Amenities & Services
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Guest experience</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line">
                    <Wifi className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Free WiFi</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line">
                    <Coffee className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Breakfast</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line">
                    <ParkingCircle className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Free Parking</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line">
                    <Clock className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">24/7 Service</span>
                  </div>
                </div>
                <p className="type-res-small text-res-ink-muted mt-2">
                  Standard amenities shown. Customize in advanced settings.
                </p>
              </div>
            </Card>

            {/* Pricing & Offers Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <DollarSign className="w-5 h-5 text-res-brand" />
                    </span>
                    Pricing & Offers
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Revenue settings</div>
                </div>
                <div className="space-y-6">
                  <Input
                    type="number"
                    placeholder="Starting Price Per Night (₦)"
                    value={formData.priceRange}
                    onChange={(e) => updateField('priceRange', Number(e.target.value))}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    placeholder="e.g., Weekend discount, Free breakfast, Early bird special"
                    value={formData.offer}
                    onChange={(e) => updateField('offer', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Hotel Policies Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <Ban className="w-5 h-5 text-res-brand" />
                    </span>
                    Hotel Policies
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Booking rules</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="type-res-small font-medium text-res-ink">Check-In Time</label>
                    <input
                      type="time"
                      value={formData.checkInTime || '14:00'}
                      onChange={(e) => updateField('checkInTime', e.target.value)}
                      className="w-full px-3 py-2 border border-res-line rounded-res-sm focus:ring-2 focus:ring-res-brand focus:border-res-brand type-res-small bg-res-card text-res-ink"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="type-res-small font-medium text-res-ink">Check-Out Time</label>
                    <input
                      type="time"
                      value={formData.checkOutTime || '12:00'}
                      onChange={(e) => updateField('checkOutTime', e.target.value)}
                      className="w-full px-3 py-2 border border-res-line rounded-res-sm focus:ring-2 focus:ring-res-brand focus:border-res-brand type-res-small bg-res-card text-res-ink"
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Describe your cancellation policy, deadlines, fees, etc."
                  value={formData.cancellationPolicy || ''}
                  onChange={(e) => updateField('cancellationPolicy', e.target.value)}
                  className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all min-h-[80px]"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line cursor-pointer transition-colors hover:bg-res-surface/70">
                    <input
                      type="checkbox"
                      checked={formData.petPolicy !== 'no'}
                      onChange={(e) =>
                        updateField('petPolicy', e.target.checked ? 'allowed' : 'no')
                      }
                      className="rounded border-res-line text-res-brand focus:ring-res-brand"
                    />
                    <Dog className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Pets Allowed</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line cursor-pointer transition-colors hover:bg-res-surface/70">
                    <input
                      type="checkbox"
                      checked={formData.smokingPolicy === 'allowed'}
                      onChange={(e) =>
                        updateField('smokingPolicy', e.target.checked ? 'allowed' : 'no')
                      }
                      className="rounded border-res-line text-res-brand focus:ring-res-brand"
                    />
                    <Ban className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Smoking Allowed</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-res-surface rounded-res-sm border border-res-line cursor-pointer transition-colors hover:bg-res-surface/70">
                    <input
                      type="checkbox"
                      checked={formData.childrenPolicy !== 'no'}
                      onChange={(e) =>
                        updateField('childrenPolicy', e.target.checked ? 'allowed' : 'no')
                      }
                      className="rounded border-res-line text-res-brand focus:ring-res-brand"
                    />
                    <Users className="w-4 h-4 text-res-brand" />
                    <span className="type-res-small text-res-ink">Children Welcome</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Payment settings live on their own page */}

            <PaymentSettingsLink />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pb-8">
              <button
                type="button"
                onClick={handleReset}
                className="type-res-small inline-flex cursor-pointer items-center gap-2 rounded-full bg-res-card px-6 py-2.5 font-semibold text-res-ink shadow-res-low transition-all outline-none hover:text-res-brand hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSubmit}
                className="type-res-small inline-flex cursor-pointer items-center gap-2 rounded-full bg-res-brand px-6 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-all outline-none hover:shadow-res-medium focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
};

export default HotelSettings;
