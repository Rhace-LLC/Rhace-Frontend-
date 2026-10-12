import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { authService } from '@/services/auth.service';
import type { RootState, AppDispatch } from '@/redux/store';

import { BusinessLogo } from '@/pages/vendor/shared/components/BusinessInfo';
import { GalleryEditor } from '@/pages/vendor/shared/components/GalleryEditor';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Building2,
  Save,
  RotateCcw,
  Sparkles,
  Image,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const HotelProfile = () => {
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
      const vendorId = vendor?._id || vendor?.id;
      if (!vendorId) {
        toast.error('Vendor ID not found. Please re-login.');
        return;
      }
      const user = await authService.vendorUpdate(formData, vendorId);
      setVendor(user?.vendor);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
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
            title="Hotel Profile"
            subtitle="Manage your hotel branding, gallery images, and public-facing information"
          />

          {/* Logo Section */}
          <div className="mt-6 mb-6 rounded-res-lg border border-res-line bg-res-card shadow-res-low p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-res-brand" />
              <h3 className="type-res-small font-semibold text-res-ink uppercase tracking-wide">
                Brand Identity
              </h3>
            </div>
            <BusinessLogo value={formData.logo} onChange={(value) => updateField('logo', value)} />
          </div>

          <div className="grid gap-6">
            {/* Profile Images / Gallery Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <Image className="w-5 h-5 text-res-brand" />
                    </span>
                    Gallery Images
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Customer-facing photos</div>
                </div>

                <GalleryEditor
                  value={formData.profileImages}
                  onChange={(urls) => updateField('profileImages', urls)}
                  hint="Upload high-quality photos of your hotel to showcase to customers. Recommended: 1200×800px."
                />
              </div>
            </Card>

            {/* Business Information Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <span className="p-1.5 bg-res-surface rounded-res-sm">
                      <Building2 className="w-5 h-5 text-res-brand" />
                    </span>
                    Public Information
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Shown on your listing</div>
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
          </div>

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
    );
};

export default HotelProfile;
