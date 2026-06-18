// HotelSettings.tsx
import DashboardLayout from "@/components/layout/DashboardLayout";
import TagInput from "@/components/TagInput";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Clock, DollarSign, Globe, Phone, Tag, Save, RotateCcw, Hotel, MapPin, Briefcase, Coffee, Wifi, ParkingCircle, Dog, Users, Ban } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { authService } from "@/services/auth.service";
import { setVendor } from "@/redux/slices/authSlice";

const HotelSettings = () => {
  const vendor = useSelector((state) => state.auth.vendor);
  const [formData, setFormData] = useState(vendor);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const user = await authService.vendorUpdate(formData);
      dispatch(setVendor(user?.vendor));
      toast.success("Successfully updated hotel settings!");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(vendor);
    toast.info("Changes have been reset");
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
                Hotel Settings
              </h1>
            </div>
            <p className="text-slate-500 ml-12">
              Manage your hotel profile, amenities, pricing, and booking preferences
            </p>
          </div>

          <div className="grid gap-6">
            {/* Business Information Card */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-700" />
                    </div>
                    Business Information
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Hotel details
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Hotel Name"
                    value={formData.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <Input
                    label="Phone Number"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <Input
                  label="Website"
                  icon={Globe}
                  placeholder="https://yourhotel.com"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />

                <div className="space-y-6">
                  <Textarea
                    label="Hotel Description"
                    placeholder="Describe your hotel's unique features, ambiance, and what makes it special..."
                    value={formData.businessDescription}
                    onChange={(e) => updateField("businessDescription", e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[100px]"
                  />
                  <Textarea
                    label="Address"
                    icon={MapPin}
                    placeholder="Enter your hotel's complete address..."
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Amenities Card - Optional section for hotels */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Briefcase className="w-5 h-5 text-blue-700" />
                    </div>
                    Amenities & Services
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Guest experience
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Free WiFi</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Coffee className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Breakfast</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <ParkingCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Free Parking</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">24/7 Service</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Standard amenities shown. Customize in advanced settings.
                </p>
              </div>
            </Card>

            {/* Pricing & Offers Card */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-700" />
                    </div>
                    Pricing & Offers
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Revenue settings
                  </div>
                </div>
                <div className="space-y-6">
                  <Input
                    type="number"
                    label="Starting Price Per Night (₦)"
                    value={formData.priceRange}
                    onChange={(e) =>
                      updateField("priceRange", Number(e.target.value))
                    }
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <Input
                    label="Special Offers"
                    placeholder="e.g., Weekend discount, Free breakfast, Early bird special"
                    value={formData.offer}
                    onChange={(e) => updateField("offer", e.target.value)}
                    className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Hotel Policies Card */}
            <Card className="group border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/30">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Ban className="w-5 h-5 text-blue-700" />
                    </div>
                    Hotel Policies
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Booking rules
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Check-In Time</label>
                    <input
                      type="time"
                      value={formData.checkInTime || "14:00"}
                      onChange={(e) => updateField("checkInTime", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Check-Out Time</label>
                    <input
                      type="time"
                      value={formData.checkOutTime || "12:00"}
                      onChange={(e) => updateField("checkOutTime", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <Textarea
                  label="Cancellation Policy"
                  placeholder="Describe your cancellation policy, deadlines, fees, etc."
                  value={formData.cancellationPolicy || ""}
                  onChange={(e) => updateField("cancellationPolicy", e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[80px]"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.petPolicy !== "no"}
                      onChange={(e) => updateField("petPolicy", e.target.checked ? "allowed" : "no")}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Dog className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Pets Allowed</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.smokingPolicy === "allowed"}
                      onChange={(e) => updateField("smokingPolicy", e.target.checked ? "allowed" : "no")}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Ban className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Smoking Allowed</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.childrenPolicy !== "no"}
                      onChange={(e) => updateField("childrenPolicy", e.target.checked ? "allowed" : "no")}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700">Children Welcome</span>
                  </label>
                </div>
              </div>
            </Card>

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
      </div>
    </DashboardLayout>
  );
};

export default HotelSettings;