import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { readDraft, saveDraft } from '@/features/reservation/draft/draftStore';
import { buildRestaurantBooking, generateReservationId } from '@/features/reservation/payload';
import { restaurantMealTotal } from '@/features/reservation/pricing';
import { validateRestaurant } from '@/features/reservation/validation';
import type { RestaurantDraft } from '@/features/reservation/types';

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
  draftId: string;
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
  booking: Record<string, unknown> | null;
  handleSubmit: () => Promise<void>;
  handleSkip: () => Promise<void>;
  isSkipLoading: boolean;
  isLoading: boolean;
}

const ReservationContext = createContext<ReservationContextValue | undefined>(undefined);

export function ReservationsProvider({
  children,
  draftId: draftIdProp,
}: {
  children: ReactNode;
  draftId?: string;
}) {
  const fallbackId = useRef(generateReservationId()).current;
  const draftId = draftIdProp || fallbackId;

  // Hydrate the wizard from the persisted draft (single source of truth).
  const initial = useRef<RestaurantDraft | null>(readDraft<RestaurantDraft>(draftId)).current;

  const [menuItems, setMenuItems] = useState<MenuItemState[]>(initial?.menuItems ?? []);
  const [additionalNote, setAdditionalNote] = useState(initial?.additionalNote ?? '');
  const [selectedOccasion, setSelectedOccasion] = useState(initial?.occasion ?? '');
  const [seatingPreference, setSeatingPreference] = useState(
    initial?.seatingPreference ?? 'indoor'
  );
  const [guestCount, setGuestCount] = useState(initial?.guests ? String(initial.guests) : '1');
  const [specialRequest, setSpecialRequest] = useState(initial?.specialRequest ?? '');
  const [activeTab, setActiveTab] = useState('Starters');
  const [page, setPage] = useState(initial?.step ?? 0);
  const [date, setDate] = useState<Date | undefined>(
    initial?.date ? new Date(initial.date) : undefined
  );
  const [time, setTime] = useState(initial?.time ?? '');
  const [vendor, setVendor] = useState<VendorState | undefined>(
    initial?.vendorSnapshot ?? undefined
  );
  const [booking, setBooking] = useState<Record<string, unknown> | null>(initial?.booking ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipLoading, setIsSkipLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const occasions = ['Birthday', 'Casual', 'Business', 'Anniversary', 'Other'];

  // Persist the draft whenever the wizard state changes.
  useEffect(() => {
    const selectedItems = menuItems.filter(
      (item) => item.selected && Number(item.quantity || 0) > 0
    );
    saveDraft<RestaurantDraft>({
      id: draftId,
      vertical: 'restaurant',
      vendorId: (vendor?._id as string) || '',
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      step: page,
      date: date ? date.toISOString() : undefined,
      time,
      guests: parseInt(guestCount, 10) || 1,
      seatingPreference,
      occasion: selectedOccasion,
      specialRequest,
      additionalNote,
      menuItems: selectedItems as Record<string, unknown>[],
      vendorSnapshot: (vendor as RestaurantDraft['vendorSnapshot']) ?? null,
      booking,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draftId,
    page,
    date,
    time,
    guestCount,
    seatingPreference,
    selectedOccasion,
    specialRequest,
    additionalNote,
    menuItems,
    vendor,
    booking,
  ]);

  const selectedMeals = menuItems.filter(
    (item) => item.selected && Number(item.quantity || 0) > 0
  );

  const persistBooking = (next: Record<string, unknown>) => {
    setBooking(next);
    saveDraft<RestaurantDraft>({
      id: draftId,
      vertical: 'restaurant',
      vendorId: (vendor?._id as string) || '',
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      step: page,
      date: date ? date.toISOString() : undefined,
      time,
      guests: parseInt(guestCount, 10) || 1,
      seatingPreference,
      occasion: selectedOccasion,
      specialRequest,
      additionalNote,
      menuItems: selectedMeals as Record<string, unknown>[],
      vendorSnapshot: (vendor as RestaurantDraft['vendorSnapshot']) ?? null,
      booking: next,
    });
  };

  const goToPrePayment = () => {
    navigate(`/restaurants/pre-payment/${draftId}?draft=${draftId}`);
  };

  const handleSkip = async () => {
    try {
      setIsSkipLoading(true);
      const error = validateRestaurant({ date, time, guests: guestCount, seatingPreference });
      if (error) throw new Error(error);
      if (!vendor?._id) throw new Error('Vendor information is missing.');

      const next = buildRestaurantBooking({
        resId: draftId,
        user,
        vendor,
        draft: {
          date: date ? date.toISOString() : undefined,
          time,
          guests: parseInt(guestCount, 10),
          seatingPreference,
          occasion: selectedOccasion || 'other',
          specialRequest,
        } as RestaurantDraft,
        selectedMeals: [],
        payLater: true,
      });
      persistBooking(next);
      goToPrePayment();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit reservation. Please try again.';
      toast.error(message);
    } finally {
      setIsSkipLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const error = validateRestaurant({ date, time, guests: guestCount, seatingPreference });
      if (error) throw new Error(error);
      if (!vendor?._id) throw new Error('Vendor information is missing.');

      const next = buildRestaurantBooking({
        resId: draftId,
        user,
        vendor,
        draft: {
          date: date ? date.toISOString() : undefined,
          time,
          guests: parseInt(guestCount, 10),
          seatingPreference,
          occasion: selectedOccasion || 'other',
          specialRequest,
        } as RestaurantDraft,
        selectedMeals,
        payLater: false,
      });
      next.totalAmount = restaurantMealTotal(selectedMeals);
      persistBooking(next);
      goToPrePayment();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit reservation. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        draftId,
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
        booking,
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

// eslint-disable-next-line react-refresh/only-export-components
export function useReservations(): ReservationContextValue {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservations must be used within a ReservationsProvider');
  }
  return context;
}
