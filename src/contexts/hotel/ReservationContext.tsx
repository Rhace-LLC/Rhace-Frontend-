import { useAuth } from '@/contexts/AuthContext';
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
import { readDraft, saveDraft } from '@/features/reservation/draft/draftStore';
import { buildHotelBooking, generateReservationId } from '@/features/reservation/payload';
import { calculateNights, hotelTotal, hotelTotalGuests, hotelTotalRooms } from '@/features/reservation/pricing';
import { validateHotel } from '@/features/reservation/validation';
import type { HotelDraft } from '@/features/reservation/types';

interface Room {
  _id: string;
  name?: string;
  pricePerNight?: number;
  discount?: number;
  category?: string;
  [key: string]: unknown;
}

interface RoomSelection {
  room: Room;
  quantity?: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  guests?: number;
  guestBreakdown?: Record<string, number> | null;
}

interface VendorState {
  _id?: string;
  address?: string;
  profileImages?: ({ url?: string } | string)[];
  [key: string]: unknown;
}

interface MenuItemState {
  selected?: boolean;
  quantity?: number;
  price?: number;
  [key: string]: unknown;
}

interface ReservationContextValue {
  draftId: string;
  roomSelections: RoomSelection[];
  setRoomSelections: Dispatch<SetStateAction<RoomSelection[]>>;
  addRoomSelection: (room: Room, quantity?: number) => void;
  updateRoomSelection: (roomId: string, updates: Partial<RoomSelection>) => void;
  removeRoomSelection: (roomId: string) => void;
  clearAllSelections: () => void;
  calculateNightsForRoom: (roomSelection: RoomSelection) => number;
  menuItems: MenuItemState[];
  setMenuItems: Dispatch<SetStateAction<MenuItemState[]>>;
  additionalNote: string;
  setAdditionalNote: Dispatch<SetStateAction<string>>;
  specialRequest: string;
  setSpecialRequest: Dispatch<SetStateAction<string>>;
  occasions: string[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  booking: Record<string, unknown> | null;
  setBooking: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  vendor: VendorState | undefined;
  setVendor: Dispatch<SetStateAction<VendorState | undefined>>;
  handleSubmit: () => Promise<number>;
  isLoading: boolean;
  setPartPay: Dispatch<SetStateAction<boolean>>;
  partPay: boolean;
  calculateTotalPrice: () => number;
  getTotalRooms: () => number;
  getTotalGuests: () => number;
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
  const initial = useRef<HotelDraft | null>(readDraft<HotelDraft>(draftId)).current;

  const [menuItems, setMenuItems] = useState<MenuItemState[]>([]);
  const [additionalNote, setAdditionalNote] = useState('');
  const [specialRequest, setSpecialRequest] = useState(initial?.specialRequest ?? '');
  const [activeTab, setActiveTab] = useState('Starters');
  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>(
    (initial?.roomSelections ?? []).map((s) => ({
      room: s.room as Room,
      quantity: s.quantity ?? 1,
      checkInDate: s.checkInDate ? new Date(s.checkInDate) : undefined,
      checkOutDate: s.checkOutDate ? new Date(s.checkOutDate) : undefined,
      guests: s.guests ?? 1,
      guestBreakdown: s.guestBreakdown ?? null,
    }))
  );
  const [page, setPage] = useState(initial?.step ?? 0);
  const [vendor, setVendor] = useState<VendorState | undefined>(
    initial?.vendorSnapshot ?? undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(initial?.booking ?? null);
  const { user } = useAuth();
  const [partPay, setPartPay] = useState(initial?.partPay ?? false);

  const calculateNightsForRoom = (roomSelection: RoomSelection): number =>
    calculateNights(roomSelection.checkInDate, roomSelection.checkOutDate) || 1;

  const calculateTotalPrice = (): number => hotelTotal(roomSelections as any);

  const getTotalRooms = (): number => hotelTotalRooms(roomSelections as any);

  const getTotalGuests = (): number => hotelTotalGuests(roomSelections as any);

  // Persist the wizard draft on change.
  useEffect(() => {
    saveDraft<HotelDraft>({
      id: draftId,
      vertical: 'hotel',
      vendorId: (vendor?._id as string) || '',
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      step: page,
      specialRequest,
      partPay,
      booking,
      vendorSnapshot: (vendor as HotelDraft['vendorSnapshot']) ?? null,
      roomSelections: roomSelections.map((s) => ({
        room: s.room,
        quantity: s.quantity ?? 1,
        checkInDate: s.checkInDate ? s.checkInDate.toISOString() : undefined,
        checkOutDate: s.checkOutDate ? s.checkOutDate.toISOString() : undefined,
        guests: s.guests ?? 1,
        guestBreakdown: s.guestBreakdown ?? null,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, page, specialRequest, partPay, booking, roomSelections, vendor]);

  const updateRoomSelection = (roomId: string, updates: Partial<RoomSelection>) => {
    setRoomSelections((prev) =>
      prev.map((selection) =>
        selection.room._id === roomId ? { ...selection, ...updates } : selection
      )
    );
  };

  const addRoomSelection = (room: Room, quantity = 1) => {
    const existingIndex = roomSelections.findIndex((s) => s.room._id === room._id);
    if (existingIndex >= 0) {
      updateRoomSelection(room._id, { quantity });
    } else {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setRoomSelections((prev) => [
        ...prev,
        { room, quantity, checkInDate: today, checkOutDate: tomorrow, guests: 1 },
      ]);
    }
  };

  const removeRoomSelection = (roomId: string) => {
    setRoomSelections((prev) => prev.filter((s) => s.room._id !== roomId));
  };

  const clearAllSelections = () => setRoomSelections([]);

  const occasions = ['Birthday', 'Casual', 'Business', 'Anniversary', 'Other'];

  const handleSubmit = async (): Promise<number> => {
    try {
      setIsLoading(true);
      const error = validateHotel(roomSelections as any);
      if (error) throw new Error(error);
      if (!vendor?._id) throw new Error('Vendor information is missing.');

      const totalAmount = calculateTotalPrice();
      const next = buildHotelBooking({
        resId: draftId,
        user,
        vendor,
        draft: { id: draftId, specialRequest } as HotelDraft,
        roomSelections: roomSelections.map((s) => ({
          room: s.room,
          quantity: s.quantity ?? 1,
          checkInDate: s.checkInDate?.toISOString(),
          checkOutDate: s.checkOutDate?.toISOString(),
          guests: s.guests ?? 1,
          guestBreakdown: s.guestBreakdown ?? null,
        })) as any,
        partPay,
        totalAmount,
      });

      setBooking(next);
      saveDraft<HotelDraft>({
        id: draftId,
        vertical: 'hotel',
        vendorId: (vendor?._id as string) || '',
        createdAt: initial?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        step: page,
        specialRequest,
        partPay,
        booking: next,
        vendorSnapshot: (vendor as HotelDraft['vendorSnapshot']) ?? null,
        roomSelections: roomSelections.map((s) => ({
          room: s.room,
          quantity: s.quantity ?? 1,
          checkInDate: s.checkInDate?.toISOString(),
          checkOutDate: s.checkOutDate?.toISOString(),
          guests: s.guests ?? 1,
          guestBreakdown: s.guestBreakdown ?? null,
        })),
      });
      return 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit reservation. Please try again.';
      toast.error(message);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        draftId,
        roomSelections,
        setRoomSelections,
        addRoomSelection,
        updateRoomSelection,
        removeRoomSelection,
        clearAllSelections,
        calculateNightsForRoom,
        menuItems,
        setMenuItems,
        additionalNote,
        setAdditionalNote,
        specialRequest,
        setSpecialRequest,
        occasions,
        activeTab,
        setActiveTab,
        booking,
        setBooking,
        page,
        setPage,
        vendor,
        setVendor,
        handleSubmit,
        isLoading,
        setPartPay,
        partPay,
        calculateTotalPrice,
        getTotalRooms,
        getTotalGuests,
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
    throw new Error('useReservations must be used within a ReservationsProvider: Hotel');
  }
  return context;
}
