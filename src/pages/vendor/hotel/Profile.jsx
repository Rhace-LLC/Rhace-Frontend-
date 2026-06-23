import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import axios from 'axios';
import { authService } from '@/services/auth.service';
import { setVendor } from '@/redux/slices/authSlice';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BusinessLogo } from '../settings/part/BusinessInfo';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Save,
  RotateCcw,
  Hotel,
  Sparkles,
  Image,
  Trash2,
  Upload,
} from 'lucide-react';

const HotelProfile = () => {
  const vendor = useSelector((state) => state.auth.vendor);
  const [formData, setFormData] = useState(vendor);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const dispatch = useDispatch();

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (files) => {
    const file = files[0];
    if (!file) return;

    setUploadingIndex('new');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', UPLOAD_PRESET);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        form
      );
      const imageUrl = response.data.secure_url;
      const currentImages = formData.profileImages || [];
      updateField('profileImages', [...currentImages, imageUrl]);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeImage = (index) => {
    const currentImages = formData.profileImages || [];
    const updated = currentImages.filter((_, i) => i !== index);
    updateField('profileImages', updated);
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
      dispatch(setVendor(user?.vendor));
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
    <DashboardLayout type={vendor?.vendorType} section="settings" settings={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Hotel className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Hotel Profile
              </h1>
            </div>
            <p className="text-slate-500 ml-12">
              Manage your hotel branding, gallery images, and public-facing information
            </p>
          </div>

          {/* Logo Section */}
          <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Brand Identity
              </h3>
            </div>
            <BusinessLogo value={formData.logo} onChange={(value) => updateField('logo', value)} />
          </div>

          <div className="grid gap-6">
            {/* Profile Images / Gallery Card */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Image className="w-5 h-5 text-blue-700" />
                    </div>
                    Gallery Images
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">Customer-facing photos</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(formData.profileImages || []).map((url, index) => (
                    <div
                      key={index}
                      className="relative group/image aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Upload new image */}
                  <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
                    {uploadingIndex === 'new' ? (
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Add Photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIndex !== null}
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  Upload high-quality photos of your hotel to showcase to customers. Recommended:
                  1200×800px.
                </p>
              </div>
            </Card>

            {/* Business Information Card */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-700" />
                    </div>
                    Public Information
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">Shown on your listing</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Hotel Name"
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <Input
                    label="Phone Number"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <Input
                  label="Website"
                  icon={Globe}
                  placeholder="https://yourhotel.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />

                <div className="space-y-6">
                  <Textarea
                    label="Hotel Description"
                    placeholder="Describe your hotel's unique features, ambiance, and what makes it special..."
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[100px]"
                  />
                  <Textarea
                    label="Address"
                    icon={MapPin}
                    placeholder="Enter your hotel's complete address..."
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6 pb-8">
            <button
              onClick={handleReset}
              className="group px-6 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              <RotateCcw className="w-4 h-4 transition-transform group-hover:rotate-[-180deg] duration-300" />
              Reset
            </button>
            <button
              disabled={isLoading}
              onClick={handleSubmit}
              className="group px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
    </DashboardLayout>
  );
};

export default HotelProfile;
