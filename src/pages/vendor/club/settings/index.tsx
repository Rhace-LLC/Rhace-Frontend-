// ClubSettings.tsx

import TagInput from '@/components/TagInput';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Input as UiInput } from '@/components/ui/input';
import { Select as UiSelect } from '@/components/ui/select';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import {
  Building2,
  Clock,
  DollarSign,
  Globe,
  Phone,
  Tag,
  Save,
  RotateCcw,
  MapPin,
  Sparkles,
  Users,
  Shield,
  PartyPopper,
  Crown,
  Image as ImageIcon,
} from 'lucide-react';
import { GalleryEditor } from '@/pages/vendor/shared/components/GalleryEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BusinessLogo } from '@/pages/vendor/shared/components/BusinessInfo';
import { authService } from '@/services/auth.service';
import { toast } from 'react-toastify';

const Input = (props: any) => <UiInput {...props} />;
const Select = (props: any) => <UiSelect {...props} />;
const Textarea = (props: any) => <UiTextarea {...props} />;
const TagInputField = (props: any) => <TagInput {...props} />;

const ClubSettings = () => {
  const { vendor, setVendor } = useAuth();
  const [formData, setFormData] = useState<any>(vendor);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const user = await authService.vendorUpdate(formData);
      setVendor(user?.vendor);
      toast.success('Successfully updated club settings!');
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

  const addTag = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value],
    }));
  };

  const removeTag = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item: string) => item !== value),
    }));
  };

  return (
    <div className="min-h-screen">
        <div className="px-4 py-8 md:px-6 lg:px-8">
          {/* Header Section */}
          <DashboardPageHeader
            title="Club Settings"
            subtitle="Manage your club profile, capacity, entry requirements, and entertainment options"
          />

          {/* Logo Section */}
          <div className="mb-8 p-6 rounded-res-lg border border-res-line bg-res-card shadow-res-low">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-res-brand" />
              <h3 className="type-res-small font-semibold text-res-ink uppercase tracking-wide">
                Brand Identity
              </h3>
            </div>
            <BusinessLogo value={formData.logo} onChange={(value) => updateField('logo', value)} />
          </div>

          {/* Photo Gallery */}
          <div className="rounded-res-lg border border-res-line bg-res-card shadow-res-low p-6 md:p-8">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-res-surface rounded-res-sm">
                <ImageIcon className="w-5 h-5 text-res-brand" />
              </span>
              <h2 className="type-res-h2 text-res-ink">Photo Gallery</h2>
            </div>
            <p className="type-res-small font-normal text-res-ink-muted mt-1 mb-4">
              Photos customers see on your listing. Changes save with the page.
            </p>
            <GalleryEditor
              value={formData.profileImages}
              onChange={(urls) => updateField('profileImages', urls)}
              hint="Showcase the room, the crowd and the nights that define you."
            />
          </div>

          <div className="grid gap-6">
            {/* Business Information Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <div className="p-1.5 bg-res-surface rounded-res-sm">
                      <Building2 className="w-5 h-5 text-res-brand" />
                    </div>
                    Business Information
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Club details</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Club Name"
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    label="Phone Number"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>

                <Input
                  label="Website"
                  icon={Globe}
                  placeholder="https://yourclub.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                />

                <div className="space-y-6">
                  <Textarea
                    label="Club Description"
                    placeholder="Describe your club's atmosphere, music genres, entertainment, and what makes the nightlife experience special..."
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all min-h-[100px]"
                  />
                  <Textarea
                    label="Address"
                    icon={MapPin}
                    placeholder="Enter your club's complete address..."
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Operating Hours & Capacity Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <div className="p-1.5 bg-res-surface rounded-res-sm">
                      <Clock className="w-5 h-5 text-res-brand" />
                    </div>
                    Operating Hours & Capacity
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Nightlife schedule</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    type="time"
                    label="Opening Time"
                    value={formData.openingTime}
                    onChange={(e) => updateField('openingTime', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    type="time"
                    label="Closing Time"
                    value={formData.closingTime}
                    onChange={(e) => updateField('closingTime', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    type="number"
                    label="Available Slots (Capacity)"
                    icon={Users}
                    value={formData.slots}
                    onChange={(e) => updateField('slots', Number(e.target.value))}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>
                <div className="mt-2 p-3 bg-res-surface rounded-res-sm border border-res-line">
                  <p className="type-res-small text-res-ink-muted flex items-center gap-1">
                    <PartyPopper className="w-3 h-3" />
                    Tip: Set your available slots based on venue capacity for optimal crowd
                    management
                  </p>
                </div>
              </div>
            </Card>

            {/* Club Details Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <div className="p-1.5 bg-res-surface rounded-res-sm">
                      <Tag className="w-5 h-5 text-res-brand" />
                    </div>
                    Club Details
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Guest policies</div>
                </div>
                <div className="space-y-6">
                  <div className="bg-res-surface p-4 rounded-res-sm border border-res-line">
                    <TagInputField
                      label="Categories"
                      placeholder="Add categories (e.g., Nightclub, Lounge, Rooftop Bar)"
                      tags={formData.categories}
                      onAdd={(value) => addTag('categories', value)}
                      onRemove={(value) => removeTag('categories', value)}
                      className="focus:ring-2 focus:ring-res-brand"
                    />
                  </div>
                  <div className="bg-res-surface p-4 rounded-res-sm border border-res-line">
                    <TagInputField
                      label="Dress Code"
                      placeholder="Add dress code (e.g., Smart Casual, Elegant, Party Wear)"
                      tags={formData.dressCode}
                      onAdd={(value) => addTag('dressCode', value)}
                      onRemove={(value) => removeTag('dressCode', value)}
                      className="focus:ring-2 focus:ring-res-brand"
                    />
                  </div>
                  <div>
                    <label className="block type-res-small font-medium text-res-ink mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-res-brand" />
                      Age Limit
                    </label>
                    <Select
                      value={formData.ageLimit}
                      onChange={(e) => updateField('ageLimit', e.target.value)}
                      options={[
                        { value: '16', label: '16 years and above' },
                        { value: '18', label: '18 years and above' },
                        { value: '21', label: '21 years and above' },
                      ]}
                      className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Pricing & Offers Card */}
            <Card className="rounded-res-lg border border-res-line bg-res-card shadow-res-low overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-res-line pb-4">
                  <h2 className="type-res-h2 text-res-ink flex items-center gap-2">
                    <div className="p-1.5 bg-res-surface rounded-res-sm">
                      <DollarSign className="w-5 h-5 text-res-brand" />
                    </div>
                    Pricing & Offers
                  </h2>
                  <div className="type-res-small text-res-ink-muted font-mono">Entry & promotions</div>
                </div>
                <div className="space-y-6">
                  <Input
                    type="number"
                    label="Entry Fee (₦)"
                    icon={Crown}
                    value={formData.priceRange}
                    onChange={(e) => updateField('priceRange', Number(e.target.value))}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                  <Input
                    label="Special Offers"
                    placeholder="e.g., Ladies night free entry, VIP packages, Bottle service deals"
                    value={formData.offer}
                    onChange={(e) => updateField('offer', e.target.value)}
                    className="focus:ring-2 focus:ring-res-brand focus:border-res-brand transition-all"
                  />
                </div>
              </div>
            </Card>

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

export default ClubSettings;