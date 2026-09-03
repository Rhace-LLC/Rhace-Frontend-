import HeroImage from '@/components/auth/HeroImage';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import logo from '../../../public/images/Rhace-11.png';
import { setVendor } from '@/redux/slices/authSlice';
import {
  Building2,
  MapPin,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  Clock,
  Utensils,
  Music,
  X,
  Phone,
  Globe,
  DollarSign,
  Tag,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import axios from 'axios';
import api from '@/lib/axios';
import { useNavigate } from 'react-router';
import { authService } from '@/services/auth.service';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/redux/store';

type OnboardFormData = {
  profileImages: string[];
  businessDescription: string;
  vendorType: string;
  phone: string;
  address: string;
  website: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  priceRange: number | string;
  offer: string;
  openingTime: string;
  closingTime: string;
  cuisines: string[];
  availableSlots: string[];
  categories: string[];
  dressCode: string[];
  ageLimit: string;
  slots: number;
};

type Bank = { name: string; code: string };

const generateTimeSlots = (start: string, end: string, interval = 60) => {
  if (!start || !end) return [];

  const slots = [];
  let current = new Date(`2026-01-01T${start}`);
  const stop = new Date(`2026-01-01T${end}`);

  // Handle overnight cases (e.g., 10 PM to 4 AM)
  if (stop <= current) {
    stop.setDate(stop.getDate() + 1);
  }

  while (current <= stop) {
    slots.push(
      current.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
    current.setMinutes(current.getMinutes() + interval);
  }
  return slots;
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const STEPS = [
  {
    id: 1,
    title: 'Business Profile',
    description: 'Tell us about your business and how customers can reach you',
    icon: Building2,
  },
  {
    id: 2,
    title: 'Payment Setup',
    description: 'Set up your payment information for secure transactions',
    icon: CreditCard,
  },
  {
    id: 3,
    title: 'Business Details',
    description: 'Add specific details about your services and offerings',
    icon: Tag,
  },
];

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank For Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

const CUISINE_OPTIONS = ['nigerian', 'italian', 'continental', 'chinese'];

// --- Validation Helpers ---

const PHONE_REGEX = /^(\+?234|0)[789]\d{9}$/;
const URL_REGEX = /^https?:\/\/.+/;
const ACCOUNT_NUMBER_REGEX = /^\d{10}$/;

const validateStep = (step: number, data: OnboardFormData) => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1: {
      if (data.profileImages.length < 5) {
        errors.profileImages = `Upload at least 5 business photos (${data.profileImages.length} uploaded)`;
      }
      if (!data.businessDescription.trim()) {
        errors.businessDescription = 'Business description is required';
      }
      if (!data.vendorType) {
        errors.vendorType = 'Select a business type';
      }
      if (!data.phone.trim()) {
        errors.phone = 'Phone number is required';
      } else if (!PHONE_REGEX.test(data.phone.trim())) {
        errors.phone = 'Enter a valid Nigerian phone number (e.g. +2348012345678)';
      }
      if (!data.address.trim()) {
        errors.address = 'Business address is required';
      } else if (data.address.trim().length < 10) {
        errors.address = 'Please enter a complete address (at least 10 characters)';
      }
      if (data.website.trim() && !URL_REGEX.test(data.website.trim())) {
        errors.website = 'Enter a valid URL starting with http:// or https://';
      }
      break;
    }
    case 2: {
      if (!data.bankCode) {
        errors.bankCode = 'Select a bank';
      }
      if (!data.accountNumber.trim()) {
        errors.accountNumber = 'Account number is required';
      } else if (!ACCOUNT_NUMBER_REGEX.test(data.accountNumber.trim())) {
        errors.accountNumber = 'Account number must be exactly 10 digits';
      }
      if (!data.accountName.trim()) {
        errors.accountName = 'Verify your account first';
      }
      break;
    }
    case 3: {
      if (data.priceRange === '' || data.priceRange === null || data.priceRange === undefined) {
        errors.priceRange = 'Price range is required';
      } else if (Number(data.priceRange) < 100) {
        errors.priceRange = 'Enter a valid minimum price (₦100 or more)';
      }
      if (data.vendorType === 'restaurant' || data.vendorType === 'club') {
        if (!data.openingTime) {
          errors.openingTime = 'Opening time is required';
        }
        if (!data.closingTime) {
          errors.closingTime = 'Closing time is required';
        }
        if (data.openingTime && data.closingTime && data.openingTime >= data.closingTime) {
          errors.closingTime = 'Closing time must be after opening time';
        }
        if (data.vendorType === 'restaurant' && data.availableSlots.length === 0) {
          errors.availableSlots = 'Select at least one available booking slot';
        }
        if (data.vendorType === 'restaurant' && data.cuisines.length === 0) {
          errors.cuisines = 'Select at least one cuisine';
        }
        if (data.vendorType === 'club') {
          if (data.categories.length === 0) {
            errors.categories = 'Add at least one category';
          }
          if (data.dressCode.length === 0) {
            errors.dressCode = 'Add at least one dress code requirement';
          }
          if (!data.ageLimit) {
            errors.ageLimit = 'Select an age limit requirement';
          }
          if (!data.slots || data.slots < 1) {
            errors.slots = 'Available slots must be at least 1';
          }
        }
      }
      break;
    }
    default:
      break;
  }

  let errLogs = { isValid: Object.keys(errors).length === 0, errors };
//  console.log("======================== errors ========================");
//  console.log(errLogs)
  return errLogs;
};

export function Onboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardFormData>({
    profileImages: [],
    businessDescription: '',
    vendorType: '',
    phone: '',
    address: '',
    website: '',
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
    priceRange: 1000,
    offer: '',
    openingTime: '',
    closingTime: '',
    cuisines: [],
    availableSlots: [],
    categories: [],
    dressCode: [],
    ageLimit: '',
    slots: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    profileImages: '',
    businessDescription: '',
    vendorType: '',
    phone: '',
    website: '',
    address: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
    priceRange: '',
    openingTime: '',
    closingTime: '',
    cuisines: '',
    availableSlots: '',
    categories: '',
    dressCode: '',
    ageLimit: '',
    slots: '',
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [isLoading, setIsloading] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateFormData = (updates: Partial<OnboardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Inside your Onboard component
  const availableTimeOptions = generateTimeSlots(formData.openingTime, formData.closingTime, 60);

  // Helper to toggle a slot (add if not there, remove if it is)
  const toggleSlot = (slot: string) => {
    const currentSlots = formData.availableSlots;
    if (currentSlots.includes(slot)) {
      updateFormData({
        availableSlots: currentSlots.filter((s) => s !== slot),
      });
    } else {
      updateFormData({ availableSlots: [...currentSlots, slot] });
    }
  };

  useEffect(() => {
    // Clear slots that are no longer within the new time range
    const validSlots = generateTimeSlots(formData.openingTime, formData.closingTime, 60);
    const filtered = formData.availableSlots.filter((slot) => validSlots.includes(slot));

    if (filtered.length !== formData.availableSlots.length) {
      updateFormData({ availableSlots: filtered });
    }
  }, [formData.openingTime, formData.closingTime]);

const removeImage = (imageUrl: string) => {
  updateFormData({
    profileImages: formData.profileImages.filter((img) => img !== imageUrl),
  });
};



  const handleImageUpload = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files).slice(0, 5); // Limit to 5 images

      const uploadedUrls = [];
      const newUploadErrors = [];

      for (const file of fileArray) {
        const fileName = file.name;
        setUploadProgress((prev) => ({ ...prev, [fileName]: 0 }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
          const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData,
            {
              onUploadProgress: (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileName]: progress,
                }));
              },
            }
          );

          const imageUrl = response.data.secure_url;
          uploadedUrls.push(imageUrl);
        } catch (error) {
          console.error('Upload failed for', fileName, error);
          setUploadProgress((prev) => ({ ...prev, [fileName]: -1 })); // -1 to indicate failure
          newUploadErrors.push(fileName);
          toast.error(`Failed to upload ${fileName}`);
        }
      }

      if (newUploadErrors.length > 0) {
        setUploadErrors((prev) => [...prev, ...newUploadErrors]);
      }

      updateFormData({
        profileImages: [...formData.profileImages, ...uploadedUrls],
      });

setUploadProgress({});
    },
    [formData.profileImages]
  );

  const SvgIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 16 16"
      className={className}
    >
      <path
        fill="#1f2937" // ← Tailwind's gray-800
        // stroke="#fff"
        strokeWidth="1"
        fillRule="evenodd"
        d="M5.5 1.333A.833.833 0 0 1 6.333.5h3.334a.833.833 0 0 1 0 1.667h-.834v.862c4.534.409 7.509 5.11 5.775 9.447a.83.83 0 0 1-.775.524H2.167a.83.83 0 0 1-.774-.524c-1.735-4.337 1.24-9.038 5.774-9.447v-.862h-.834a.833.833 0 0 1-.833-.834m2.308 3.334c-3.521 0-5.986 3.377-5.047 6.666h10.478c.94-3.289-1.526-6.666-5.047-6.666zm-7.308 10a.833.833 0 0 1 .833-.834h13.334a.833.833 0 0 1 0 1.667H1.333a.833.833 0 0 1-.833-.833"
        clipRule="evenodd"
      />
    </svg>
  );

  const SvgIcon2 = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 18 18"
      className={className}
    >
      <path
        fill="#1f2937"
        // stroke="#fff"
        strokeWidth="1"
        fillRule="evenodd"
        d="M7.96.83a1.67 1.67 0 0 0-1.384.153l-3.433 2.06a1.67 1.67 0 0 0-.81 1.429v11.195H1.5a.833.833 0 0 0 0 1.666h15a.833.833 0 1 0 0-1.666h-.833V4.6a1.67 1.67 0 0 0-1.14-1.58zM14 15.668V4.6L8.167 2.657v13.01zM6.5 2.972 4 4.472v11.195h2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
  const SvgIcon3 = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="18"
      viewBox="0 0 14 18"
      fill="currentColor"
      className={className}
    >
      <path
        fill="#111827"
        fillRule="evenodd"
        d="M11.1666 0.666992C11.8296 0.666992 12.4655 0.930384 12.9344 1.39923C13.4032 1.86807 13.6666 2.50395 13.6666 3.16699V14.8337C13.6666 15.4967 13.4032 16.1326 12.9344 16.6014C12.4655 17.0703 11.8296 17.3337 11.1666 17.3337H2.83325C2.17021 17.3337 1.53433 17.0703 1.06549 16.6014C0.596644 16.1326 0.333252 15.4967 0.333252 14.8337V3.16699C0.333252 2.50395 0.596644 1.86807 1.06549 1.39923C1.53433 0.930384 2.17021 0.666992 2.83325 0.666992H11.1666ZM11.1666 2.33366H2.83325C2.61224 2.33366 2.40028 2.42146 2.244 2.57774C2.08772 2.73402 1.99992 2.94598 1.99992 3.16699V14.8337C1.99992 15.0547 2.08772 15.2666 2.244 15.4229C2.40028 15.5792 2.61224 15.667 2.83325 15.667H11.1666C11.3876 15.667 11.5996 15.5792 11.7558 15.4229C11.9121 15.2666 11.9999 15.0547 11.9999 14.8337V3.16699C11.9999 2.94598 11.9121 2.73402 11.7558 2.57774C11.5996 2.42146 11.3876 2.33366 11.1666 2.33366ZM6.99992 7.33366C7.88397 7.33366 8.73182 7.68485 9.35694 8.30997C9.98206 8.93509 10.3333 9.78294 10.3333 10.667C10.3333 11.551 9.98206 12.3989 9.35694 13.024C8.73182 13.6491 7.88397 14.0003 6.99992 14.0003C6.11586 14.0003 5.26802 13.6491 4.6429 13.024C4.01777 12.3989 3.66659 11.551 3.66659 10.667C3.66659 9.78294 4.01777 8.93509 4.6429 8.30997C5.26802 7.68485 6.11586 7.33366 6.99992 7.33366ZM6.99992 9.00033C6.55789 9.00033 6.13397 9.17592 5.82141 9.48848C5.50885 9.80104 5.33325 10.225 5.33325 10.667C5.33325 11.109 5.50885 11.5329 5.82141 11.8455C6.13397 12.1581 6.55789 12.3337 6.99992 12.3337C7.44195 12.3337 7.86587 12.1581 8.17843 11.8455C8.49099 11.5329 8.66658 11.109 8.66658 10.667C8.66658 10.225 8.49099 9.80104 8.17843 9.48848C7.86587 9.17592 7.44195 9.00033 6.99992 9.00033ZM6.99992 4.00033C7.33144 4.00033 7.64938 4.13202 7.8838 4.36644C8.11822 4.60086 8.24992 4.9188 8.24992 5.25033C8.24992 5.58185 8.11822 5.89979 7.8838 6.13421C7.64938 6.36863 7.33144 6.50033 6.99992 6.50033C6.6684 6.50033 6.35046 6.36863 6.11603 6.13421C5.88161 5.89979 5.74992 5.58185 5.74992 5.25033C5.74992 4.9188 5.88161 4.60086 6.11603 4.36644C6.35046 4.13202 6.6684 4.00033 6.99992 4.00033Z"
        clipRule="evenodd"
      />
    </svg>
  );

  const handleBankVerification = async () => {
    if (!formData.bankCode || !formData.accountNumber) return;

    // Client-side validation: account number must be 10 digits
    if (!ACCOUNT_NUMBER_REGEX.test(formData.accountNumber.trim())) {
      setErrors((prev) => ({
        ...prev,
        accountNumber: 'Account number must be exactly 10 digits',
      }));
      toast.warn('Please enter a valid 10-digit account number before verifying.');
      return;
    }

    setIsVerifyingBank(true);
    setBankVerified(false);

    try {
      const response = await api.get('/payments/verify-account', {
        params: {
          account_number: formData.accountNumber,
          bank_code: formData.bankCode,
        },
      });
      console.log('Verification response:', response);

      const { accountName } = response.data;

      updateFormData({
        bankName: banks.find((b) => b.code === formData.bankCode)?.name || '',
        accountName,
      });

      setBankVerified(true);
      clearError('accountNumber');
      clearError('bankCode');
      clearError('accountName');
    } catch (error) {
      console.error('Account verification failed:', error);
      const errorMsg = error.response?.data?.error || 'Verification failed. Please try again.';
      setErrors((prev) => ({ ...prev, accountNumber: errorMsg }));
      toast.error(errorMsg);
      setBankVerified(false);
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const addTag = (field: 'cuisines' | 'categories' | 'dressCode', value: string) => {
    const currentArray = formData[field];
    if (!currentArray.includes(value) && value.trim()) {
      updateFormData({ [field]: [...currentArray, value.trim()] });
      clearError(field);
    }
  };

  const removeTag = (field: 'cuisines' | 'categories' | 'dressCode', value: string) => {
    const currentArray = formData[field];
    updateFormData({ [field]: currentArray.filter((item) => item !== value) });
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.profileImages.length >= 5 &&
          formData.businessDescription.trim() &&
          formData.vendorType &&
          formData.phone.trim() &&
          formData.address.trim()
        );
      case 2:
        return bankVerified && formData.accountName.trim();
      case 3:
        return formData.priceRange;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const { isValid, errors: stepErrors } = validateStep(currentStep, formData);
    if (!isValid) {
      setErrors(stepErrors);
      toast.warn('Please fix the highlighted fields before continuing.');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setErrors({
        profileImages: '',
        businessDescription: '',
        vendorType: '',
        phone: '',
        website: '',
        address: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
        priceRange: '',
        openingTime: '',
        closingTime: '',
        cuisines: '',
        availableSlots: '',
        categories: '',
        dressCode: '',
        ageLimit: '',
        slots: '',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({
        profileImages: '',
        businessDescription: '',
        vendorType: '',
        phone: '',
        website: '',
        address: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
        priceRange: '',
        openingTime: '',
        closingTime: '',
        cuisines: '',
        availableSlots: '',
        categories: '',
        dressCode: '',
        ageLimit: '',
        slots: '',
      });
    }
  };
  const navigate = useNavigate();

  const handleSubmit = async () => {
    // Validate step 3 before submitting
    const { isValid, errors: stepErrors } = validateStep(3, formData);
    if (!isValid) {
      setErrors(stepErrors);
      toast.warn('Please fix the highlighted fields before continuing.');
      return;
    }

    setIsloading(true);

    try {
      const user = await authService.vendorOnboard(formData);
      console.log(user);
      dispatch(setVendor(user?.vendor));

      // Handle response (optional: use response.data if needed)
      toast.success('Completed Onboarding Successfully!');

      // Optionally reset form or redirect
      navigate(`/dashboard`);
      // resetFormData()
    } catch (error) {
      console.error('Onboarding failed:', error);

      toast.error(error.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsloading(false);
    }
  };

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await api.get('/payments/banks');
        setBanks(response.data.data);
      } catch (err) {
        setError('Failed to load banks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  // --- onBlur validation handlers ---
  const handleBlur = (field: string) => {
    const stepErrors = validateStep(currentStep, formData).errors;
    if (stepErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: stepErrors[field] }));
    } else {
      clearError(field);
    }
  };

  return (
    <div className="w-full h-screen flex p-4 bg-white">
      <HeroImage role="vendor" />
      <div className="flex-1 h-full overflow-y-auto hide-scrollbar">
        <div className="min-h-screen flex items-center py-5 justify-center">
          <Card className="w-full max-w-lg bg-white shadow-none gap-3 p-0 border-none">
            <CardHeader className="text-left">
              <div className="flex items-center justify-center gap-2 mb-3">
                <img src={logo} alt="Rhace Logo" className="w-20 h-20 object-contain" />
              </div>
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                    Tell us about your business
                  </h2>
                  <p className="text-muted-foreground text-pretty max-w-2xl">
                    Share some details about what you offer and how customers can find you.
                  </p>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Set up your payments
                  </h2>
                  <p className="text-muted-foreground">
                    Add your bank details to receive payments from customers.
                  </p>
                </>
              )}
              {currentStep === 3 && (
                <>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Business Details</h2>
                  <p className="text-muted-foreground">
                    Add specific information about your services and pricing.
                  </p>
                </>
              )}
            </CardHeader>

            <div className="flex items-center justify-center gap-2 px-6">
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center w-full">
                    <div
                      className={cn('w-full h-2 rounded-full transition-all', {
                        'bg-[#0A6C6D]': isCompleted || isActive,
                        'bg-border': !isCompleted && !isActive,
                      })}
                    />
                  </div>
                );
              })}
            </div>
            <CardContent>
              {currentStep === 1 && (
                <div className="space-y-8">
                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      Business Photos (Upload at least 5)
                    </Label>
                    <div className={cn(
                      'border-2 border-dashed bg-white rounded-lg p-8 text-center hover:border-primary/50 transition-colors',
                      errors.profileImages ? 'border-red-500' : 'border-border'
                    )}>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop your images here, or click to browse
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleImageUpload(e.target.files);
                            clearError('profileImages');
                          }
                        }}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="image-upload" className="cursor-pointer">
                          Choose Files
                        </label>
                      </Button>
                    </div>
                    {errors.profileImages && (
                      <p className="text-red-500 text-xs mt-1">{errors.profileImages}</p>
                    )}

                    {/* Upload Progress */}
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{fileName}</span>
                          {progress === -1 ? (
                            <span className="text-red-500 font-medium">Failed</span>
                          ) : (
                            <span>{Math.round(progress)}%</span>
                          )}
                        </div>
                        <Progress
                          value={progress === -1 ? 0 : progress}
                          className={cn('h-2', progress === -1 && 'bg-red-200')}
                        />
                      </div>
                    ))}
                    {uploadErrors.length > 0 && (
                      <div className="space-y-1">
                        {uploadErrors.map((name) => (
                          <p key={name} className="text-red-500 text-xs">
                            ✕ Failed to upload {name}
                          </p>
                        ))}
                      </div>
                    )}
                    {formData.profileImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {formData.profileImages.map((image, index) => (
                          <div
                            key={`${image}-${index}`}
                            className="relative group aspect-square overflow-hidden rounded-lg border bg-muted"
                          >
                            <img
                              src={image}
                              alt={`Business ${index + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => removeImage(image)}
                              className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formData.profileImages.length} images uploaded
                    </p>
                  </div>

                  {/* Business Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-medium">
                      Business Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Tell customers what makes your business special..."
                      value={formData.businessDescription}
                      onChange={(e) => {
                        updateFormData({ businessDescription: e.target.value });
                        clearError('businessDescription');
                      }}
                      onBlur={() => handleBlur('businessDescription')}
                      className={cn(
                        'min-h-[120px] resize-none w-full h-10 sm:h-12 rounded-md bg-white/50 text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                        errors.businessDescription
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                      )}
                      aria-invalid={!!errors.businessDescription}
                    />
                    {errors.businessDescription && (
                      <p className="text-red-500 text-xs mt-1">{errors.businessDescription}</p>
                    )}
                  </div>

                  {/* Vendor Category */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Business Type</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'hotel', label: 'Hotel', Icon: SvgIcon2 },
                        {
                          value: 'restaurant',
                          label: 'Restaurant',
                          Icon: SvgIcon,
                        },
                        { value: 'club', label: 'Club', Icon: SvgIcon3 },
                      ].map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            updateFormData({ vendorType: value });
                            clearError('vendorType');
                          }}
                          className={cn(
                            'p-4 rounded-lg border-2 transition-all flex gap-2 text-left hover:border-primary/50',
                            formData.vendorType === value
                              ? 'border-primary bg-primary/5'
                              : errors.vendorType
                                ? 'border-red-500'
                                : 'border-border'
                          )}
                        >
                          <Icon className="w-6 h-6 text-primary" />
                          <div className="font-medium">{label}</div>
                        </button>
                      ))}
                    </div>
                    {errors.vendorType && (
                      <p className="text-red-500 text-xs mt-1">{errors.vendorType}</p>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-base font-medium flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={formData.phone}
                        onChange={(e) => {
                          updateFormData({ phone: e.target.value });
                          clearError('phone');
                        }}
                        onBlur={() => handleBlur('phone')}
                        className={cn(
                          'w-full h-10 sm:h-12 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                          errors.phone
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                        )}
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="website"
                        className="text-base font-medium flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Website (Optional)
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://yourwebsite.com"
                        value={formData.website}
                        onChange={(e) => {
                          updateFormData({ website: e.target.value });
                          clearError('website');
                        }}
                        onBlur={() => handleBlur('website')}
                        className={cn(
                          'w-full h-10 sm:h-12 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                          errors.website
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                        )}
                        aria-invalid={!!errors.website}
                      />
                      {errors.website && (
                        <p className="text-red-500 text-xs mt-1">{errors.website}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="address"
                      className="text-base font-medium flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Business Address
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your complete business address..."
                      value={formData.address}
                      onChange={(e) => {
                        updateFormData({ address: e.target.value });
                        clearError('address');
                      }}
                      onBlur={() => handleBlur('address')}
                      className={cn(
                        'min-h-20 resize-none w-full h-10 sm:h-12 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                        errors.address
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                      )}
                      aria-invalid={!!errors.address}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  {/* Bank Selection */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Select Your Bank</Label>
                    <Select
                      value={formData.bankCode}
                      disabled={loading}
                      onValueChange={(value) => {
                        const bank = banks.find((b) => b.code === value);
                        updateFormData({
                          bankCode: value,
                          bankName: bank?.name || '',
                        });
                        setBankVerified(false);
                        clearError('bankCode');
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          errors.bankCode && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        )}
                      >
                        {loading ? (
                          <>
                            <span>Loading Banks...</span>
                          </>
                        ) : (
                          <SelectValue placeholder="Choose your bank" />
                        )}
                      </SelectTrigger>
                      <SelectContent className="w-full max-w-[300px]">
                        {banks.map((bank, i) => (
                          <SelectItem key={i} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bankCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.bankCode}</p>
                    )}
                  </div>

                  {/* Account Number */}
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="text-base font-medium">
                      Account Number
                    </Label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          id="accountNumber"
                          placeholder="Enter your 10-digit account number"
                          value={formData.accountNumber}
                          onChange={(e) => {
                            updateFormData({ accountNumber: e.target.value });
                            setBankVerified(false);
                            clearError('accountNumber');
                          }}
                          onBlur={() => handleBlur('accountNumber')}
                          maxLength={10}
                          className={cn(
                            'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                            errors.accountNumber
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                          )}
                          aria-invalid={!!errors.accountNumber}
                        />
                        {errors.accountNumber && (
                          <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleBankVerification}
                        disabled={!formData.bankCode || !formData.accountNumber || isVerifyingBank}
                        className="w-[100px] h-[25px] py-5 rounded-md bg-[#0A6C6D] text-white text-sm font-normal transition-transform duration-200 hover:shadow-lg hover:bg-[#0A6C6D]"
                      >
                        {isVerifyingBank ? (
                          <span className="flex gap-2 items-center">
                            <Clock className="w-4 h-4 animate-spin" />
                            Verifying
                          </span>
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Verification Result */}
                  {bankVerified && formData.accountName && (
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <div className="flex items-center gap-2 text-success mb-2">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Account Verified</span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">Account Name:</span> {formData.accountName}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Bank:</span> {formData.bankName}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Price Range
                    </Label>
                    <Input
                      type="number"
                      value={formData.priceRange}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData({
                          priceRange: value === '' ? '' : Number(value),
                        });
                        clearError('priceRange');
                      }}
                      onBlur={() => handleBlur('priceRange')}
                      className={cn(
                        'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                        errors.priceRange
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                      )}
                      aria-invalid={!!errors.priceRange}
                    />
                    {errors.priceRange && (
                      <p className="text-red-500 text-xs mt-1">{errors.priceRange}</p>
                    )}
                  </div>

                  {/* General Offer */}
                  <div className="space-y-2">
                    <Label htmlFor="offer" className="text-base font-medium">
                      Special Offers (Optional)
                    </Label>
                    <Input
                      id="offer"
                      placeholder="e.g., 20% off first booking, Free WiFi, etc."
                      value={formData.offer}
                      onChange={(e) => updateFormData({ offer: e.target.value })}
                      className="w-full h-10 sm:h-11 rounded-md border-[#0A6C6D] bg-white 
                          text-black text-sm placeholder-[#a0a3a8]
                          focus:outline-none focus:border-[#0A6C6D] focus:ring-1 focus:ring-[#0A6C6D]
                          hover:border-[#0A6C6D] transition-all duration-300 ease-in-out pl-3"
                    />
                  </div>

                  {/* Category-specific fields */}
                  {formData.vendorType === 'restaurant' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="openingTime" className="text-base font-medium">
                            Opening Time
                          </Label>
                          <Input
                            id="openingTime"
                            type="time"
                            value={formData.openingTime}
                            onChange={(e) => {
                              updateFormData({ openingTime: e.target.value });
                              clearError('openingTime');
                            }}
                            onBlur={() => handleBlur('openingTime')}
                            className={cn(
                              'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                              errors.openingTime
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                            )}
                            aria-invalid={!!errors.openingTime}
                          />
                          {errors.openingTime && (
                            <p className="text-red-500 text-xs mt-1">{errors.openingTime}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="closingTime" className="text-base font-medium">
                            Closing Time
                          </Label>
                          <Input
                            id="closingTime"
                            type="time"
                            value={formData.closingTime}
                            onChange={(e) => {
                              updateFormData({ closingTime: e.target.value });
                              clearError('closingTime');
                            }}
                            onBlur={() => handleBlur('closingTime')}
                            className={cn(
                              'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                              errors.closingTime
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                            )}
                            aria-invalid={!!errors.closingTime}
                          />
                          {errors.closingTime && (
                            <p className="text-red-500 text-xs mt-1">{errors.closingTime}</p>
                          )}
                        </div>
                      </div>

                      {/* Cuisine Selection from List */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Cuisines</Label>
                        <Select
                          onValueChange={(value) => addTag('cuisines', value)}
                        >
                          <SelectTrigger
                            className={cn(
                              'w-full h-10 sm:h-12 text-black placeholder:text-black',
                              errors.cuisines && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            )}
                          >
                            <SelectValue placeholder="Select a cuisine to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {CUISINE_OPTIONS.filter(
                              (option) => !formData.cuisines.includes(option)
                            ).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.cuisines && (
                          <p className="text-red-500 text-xs mt-1">{errors.cuisines}</p>
                        )}

                        {/* Display Selected Cuisines as Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.cuisines.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1 bg-primary/10 text-primary border-none"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag('cuisines', tag)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Replace your old TagInput for Available Slots with this: */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Select Available Booking Slots
                        </Label>
                        {!formData.openingTime || !formData.closingTime ? (
                          <p className="text-sm text-amber-600 italic">
                            Please set opening and closing times first.
                          </p>
                        ) : (
                          <div className={cn(
                            'grid grid-cols-3 sm:grid-cols-4 gap-2',
                            errors.availableSlots && 'p-2 border border-red-500 rounded-md'
                          )}>
                            {availableTimeOptions.map((slot) => {
                              const isSelected = formData.availableSlots.includes(slot);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    toggleSlot(slot);
                                    clearError('availableSlots');
                                  }}
                                  className={cn(
                                    'py-2 px-1 text-xs rounded-md border transition-all',
                                    isSelected
                                      ? 'bg-[#0A6C6D] text-white border-[#0A6C6D]'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0A6C6D]'
                                  )}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {errors.availableSlots && (
                          <p className="text-red-500 text-xs mt-1">{errors.availableSlots}</p>
                        )}

                        {/* Show count of selected slots */}
                        <p className="text-xs text-muted-foreground">
                          {formData.availableSlots.length} slots selected
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.vendorType === 'club' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="openingTime" className="text-base font-medium">
                            Opening Time
                          </Label>
                          <Input
                            id="openingTime"
                            type="time"
                            value={formData.openingTime}
                            onChange={(e) => {
                              updateFormData({ openingTime: e.target.value });
                              clearError('openingTime');
                            }}
                            onBlur={() => handleBlur('openingTime')}
                            className={cn(
                              'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                              errors.openingTime
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                            )}
                            aria-invalid={!!errors.openingTime}
                          />
                          {errors.openingTime && (
                            <p className="text-red-500 text-xs mt-1">{errors.openingTime}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="closingTime" className="text-base font-medium">
                            Closing Time
                          </Label>
                          <Input
                            id="closingTime"
                            type="time"
                            value={formData.closingTime}
                            onChange={(e) => {
                              updateFormData({ closingTime: e.target.value });
                              clearError('closingTime');
                            }}
                            onBlur={() => handleBlur('closingTime')}
                            className={cn(
                              'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                              errors.closingTime
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                            )}
                            aria-invalid={!!errors.closingTime}
                          />
                          {errors.closingTime && (
                            <p className="text-red-500 text-xs mt-1">{errors.closingTime}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slots" className="text-base font-medium">
                            Available Slots
                          </Label>
                          <Input
                            id="slots"
                            type="number"
                            min="1"
                            placeholder="e.g., 100"
                            value={formData.slots || ''}
                            onChange={(e) => {
                              updateFormData({
                                slots: Number.parseInt(e.target.value) || 0,
                              });
                              clearError('slots');
                            }}
                            onBlur={() => handleBlur('slots')}
                            className={cn(
                              'w-full h-10 sm:h-11 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
                              errors.slots
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
                            )}
                            aria-invalid={!!errors.slots}
                          />
                          {errors.slots && (
                            <p className="text-red-500 text-xs mt-1">{errors.slots}</p>
                          )}
                        </div>
                      </div>

                      <TagInput
                        label="Categories"
                        placeholder="Add categories (e.g., Nightclub, Lounge, Sports Bar)"
                        tags={formData.categories}
                        onAdd={(value) => addTag('categories', value)}
                        onRemove={(value) => removeTag('categories', value)}
                        error={errors.categories}
                      />

                      <TagInput
                        label="Dress Code"
                        placeholder="Add dress code requirements (e.g., Smart Casual, Formal)"
                        tags={formData.dressCode}
                        onAdd={(value) => addTag('dressCode', value)}
                        onRemove={(value) => removeTag('dressCode', value)}
                        error={errors.dressCode}
                      />

                      <div className="space-y-2">
                        <Label className="text-base font-medium">Age Limit</Label>
                        <Select
                          value={formData.ageLimit}
                          onValueChange={(value) => {
                            updateFormData({ ageLimit: value });
                            clearError('ageLimit');
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              errors.ageLimit && 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            )}
                          >
                            <SelectValue placeholder="Select age requirement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16">16 years and above</SelectItem>
                            <SelectItem value="18">18 years and above</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.ageLimit && (
                          <p className="text-red-500 text-xs mt-1">{errors.ageLimit}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedToNext()}
                    className="flex items-center gap-2 bg-[#0A6C6D]"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceedToNext()}
                    className="flex items-center gap-2 bg-[#0A6C6D]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  error?: string;
}

function TagInput({ label, placeholder, tags, onAdd, onRemove, error }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-base font-medium">{label}</Label>
      <div className="flex gap-2 items-center">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-10 sm:h-12 rounded-md bg-white text-black text-sm placeholder-[#a0a3a8] focus:outline-none focus:ring-1 transition-all duration-300 ease-in-out pl-3',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[#0A6C6D] focus:border-[#0A6C6D] focus:ring-[#0A6C6D] hover:border-[#0A6C6D]'
          )}
        />
        <button
          onClick={() => {
            if (!inputValue.trim()) return;
            onAdd(inputValue);
            setInputValue('');
          }}
          className="h-10 sm:h-12 p-2 text-white rounded-md bg-[#0A6C6D]"
        >
          <div>
            <Plus className="size-5" />
          </div>
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default Onboard;