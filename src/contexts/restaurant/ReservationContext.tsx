import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import type { AuthUser } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItemState {
  selected?: boolean;
  quantity?: number;
  price?: number;
  _id?: string;
  [key: string]: unknown;
}

interface VendorState {
  _id?: string;
  address?: string;
  profileImages?: ({ url?: string } | string)[];
  [key: string]: unknown;
}

interface ReservationContextValue {
  menuItems: MenuItemState[];
  setMenuItems: Dispatch<SetStateAction<MenuItemState[]>>;
  additionalNote: string;
  setAdditionalNote: Dispatch<SetStateAction<string>>;
  selectedOccasion: string;
  setSelectedOccasion: Dispatch<SetStateAction<string>>;
  seatingPreference: string;
  setSeatingPreference: Dispatch<SetStateAction<string>>;
  guestCount: string;
  setGuestCount: Dispatch<SetStateAction<string>>;
  specialRequest: string;
  setSpecialRequest: Dispatch<SetStateAction<string>>;
  occasions: string[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
  time: string;
  setTime: Dispatch<SetStateAction<string>>;
  vendor: VendorState | undefined;
  setVendor: Dispatch<SetStateAction<VendorState | undefined>>;
  handleSubmit: () => Promise<void>;
  handleSkip: () => Promise<void>;
  isSkipLoading: boolean;
  isLoading: boolean;
}

const ReservationContext = createContext<ReservationContextValue | undefined>(undefined);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItemState[]>([]);
  const [additionalNote, setAdditionalNote] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [seatingPreference, setSeatingPreference] = useState('indoor');
  const [guestCount, setGuestCount] = useState('1');
  const [specialRequest, setSpecialRequest] = useState('');
  const [activeTab, setActiveTab] = useState('Starters');
  const [page, setPage] = useState(0);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [vendor, setVendor] = useState<VendorState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipLoading, setIsSkipLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const occasions = ['Birthday', 'Casual', 'Business', 'Anniversary', 'Other'];

  const generateId = () => {
    return Date.now().toString(36).substring(0, 8).toUpperCase();
  };

  const handleSkip = async () => {
    try {
      setIsSkipLoading(true);
      if (!date || !seatingPreference || !guestCount || !time) {
        throw new Error('Please fill in all required fields.');
      }

      if (!vendor?._id) {
        throw new Error('Vendor information is missing.');
      }

      const parsedGuestCount = parseInt(guestCount, 10);
      if (isNaN(parsedGuestCount) || parsedGuestCount < 1) {
        throw new Error('Please enter a valid number of guests.');
      }

      const reservationData = {
        resId: generateId(),
        reservationType: 'restaurant',
        customerName: `${user?.firstName} ${user?.lastName}`.trim(),
        customerEmail: user?.email,
        customerId: user?._id,
        date: date.toISOString(),
        time,
        guests: parsedGuestCount,
        menus: [],
        seatingPreference,
        specialOccasion: selectedOccasion || 'other',
        specialRequest,
        totalAmount: 1000,
        vendor: vendor._id,
        payLater: true,
        location: vendor.address,
        image: vendor.profileImages?.[0],
      };

      const resDatas = JSON.parse(localStorage.getItem('resData') || '[]');
      localStorage.setItem('resData', JSON.stringify([...resDatas, reservationData]));

      navigate(`/restaurants/pre-payment/${reservationData.resId}`);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Failed to submit reservation. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        errorMessage =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to submit reservation. Please try again.';
      }
      toast.error(errorMessage);
    } finally {
      setIsSkipLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!date || !seatingPreference || !guestCount || !time) {
        throw new Error('Please fill in all required fields.');
      }

      if (!vendor?._id) {
        throw new Error('Vendor information is missing.');
      }

      const parsedGuestCount = parseInt(guestCount, 10);
      if (isNaN(parsedGuestCount) || parsedGuestCount < 1) {
        throw new Error('Please enter a valid number of guests.');
      }

      const selectedMeals = menuItems.filter((item) => item.selected && (item.quantity || 0) > 0);

      // Calculate total price
      const totalPrice = selectedMeals.reduce(
        (total, item) => total + (item.price || 0) * (item.quantity || 1),
        0
      );

      // Prepare reservation data
      const reservationData = {
        resId: generateId(),
        reservationType: 'restaurant',
        customerName: `${user?.firstName} ${user?.lastName}`.trim(),
        customerEmail: user?.email,
        customerId: user?._id,
        date: date.toISOString(),
        time,
        guests: parsedGuestCount,
        seatingPreference,
        specialOccasion: selectedOccasion || 'other',
        specialRequest,
        mealPreselected: selectedMeals.length > 0,
        menus: selectedMeals,
        totalAmount: totalPrice,
        vendor: vendor._id,
        location: vendor.address,
        image: vendor.profileImages?.[0],
      };

      const resDatas = JSON.parse(localStorage.getItem('resData') || '[]');
      localStorage.setItem('resData', JSON.stringify([...resDatas, reservationData]));

      navigate(`/restaurants/pre-payment/${reservationData.resId}`);
    } catch (error) {
      console.error('Error submitting reservation:', error);

      let errorMessage = 'Failed to submit reservation. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'response' in error) {
        errorMessage =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to submit reservation. Please try again.';
      }
      toast.error(errorMessage);

      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: unknown } }).response?.data
      ) {
        console.error(
          'Server error details:',
          (error as { response?: { data?: unknown } }).response?.data
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        menuItems,
        setMenuItems,
        additionalNote,
        setAdditionalNote,
        selectedOccasion,
        setSelectedOccasion,
        seatingPreference,
        setSeatingPreference,
        guestCount,
        setGuestCount,
        specialRequest,
        setSpecialRequest,
        occasions,
        activeTab,
        setActiveTab,
        page,
        setPage,
        date,
        setDate,
        time,
        setTime,
        vendor,
        setVendor,
        handleSubmit,
        handleSkip,
        isSkipLoading,
        isLoading,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservations(): ReservationContextValue {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservations must be used within a ReservationsProvider');
  }
  return context;
}
