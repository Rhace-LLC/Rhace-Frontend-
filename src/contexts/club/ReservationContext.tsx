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
import { buildClubBooking, generateReservationId } from '@/features/reservation/payload';
import { clubTotal } from '@/features/reservation/pricing';
import { validateClub } from '@/features/reservation/validation';
import type { ClubDraft } from '@/features/reservation/types';

interface ComboItem {
  _id?: string;
  selected?: boolean;
  setPrice?: number;
  [key: string]: unknown;
}

interface BottleItem {
  _id?: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
}

interface VipExtraItem {
  selected?: boolean;
  price?: number;
  _id?: string;
  [key: string]: unknown;
}

interface TableItem {
  _id?: string;
  quantity?: number;
  price?: number;
  [key: string]: unknown;
}

interface VendorState {
  _id?: string;
  businessName?: string;
  address?: string;
  profileImages?: ({ url?: string } | string)[];
  [key: string]: unknown;
}

interface ReservationContextValue {
  draftId: string;
  comboItems: ComboItem[];
  setComboItems: Dispatch<SetStateAction<ComboItem[]>>;
  bottleItems: BottleItem[];
  setBottleItems: Dispatch<SetStateAction<BottleItem[]>>;
  vipExtraItems: VipExtraItem[];
  setVipExtraItems: Dispatch<SetStateAction<VipExtraItem[]>>;
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
  table: TableItem[];
  setTable: Dispatch<SetStateAction<TableItem[]>>;
  tableId: string | undefined;
  vendor: VendorState | undefined;
  setVendor: Dispatch<SetStateAction<VendorState | undefined>>;
  handleSubmit: () => Promise<boolean | void>;
  isLoading: boolean;
  totalPrice: number;
  setProposedPayment: Dispatch<SetStateAction<number>>;
  proposedPayment: number;
  booking: Record<string, unknown> | null;
  setPartPay: Dispatch<SetStateAction<boolean>>;
  partPay: boolean;
  tableSelected: TableItem[];
  setLoading: Dispatch<SetStateAction<boolean>>;
  setComboLoading: Dispatch<SetStateAction<boolean>>;
  setBottlesLoading: Dispatch<SetStateAction<boolean>>;
  setTableLoading: Dispatch<SetStateAction<boolean>>;
  loading: boolean;
  comboLoading: boolean;
  bottlesLoading: boolean;
  tableLoading: boolean;
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
  const initial = useRef<ClubDraft | null>(readDraft<ClubDraft>(draftId)).current;

  const [comboItems, setComboItems] = useState<ComboItem[]>(initial?.comboItems ?? []);
  const [bottleItems, setBottleItems] = useState<BottleItem[]>(initial?.bottleItems ?? []);
  const [vipExtraItems, setVipExtraItems] = useState<VipExtraItem[]>(
    initial?.vipExtraItems ?? []
  );
  const [guestCount, setGuestCount] = useState(initial?.guests ? String(initial.guests) : '1');
  const [specialRequest, setSpecialRequest] = useState(initial?.specialRequest ?? '');
  const [activeTab, setActiveTab] = useState('Starters');
  const [page, setPage] = useState(initial?.step ?? 0);
  const [date, setDate] = useState<Date | undefined>(
    initial?.date ? new Date(initial.date) : undefined
  );
  const [time, setTime] = useState(initial?.time ?? '');
  const [table, setTable] = useState<TableItem[]>(initial?.table ?? []);
  const [vendor, setVendor] = useState<VendorState | undefined>(
    initial?.vendorSnapshot ?? undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [proposedPayment, setProposedPayment] = useState(0);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(initial?.booking ?? null);
  const [partPay, setPartPay] = useState(initial?.partPay ?? false);
  const [loading, setLoading] = useState(true);
  const [comboLoading, setComboLoading] = useState(true);
  const [bottlesLoading, setBottlesLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const { user } = useAuth();

  const occasions = ['Birthday', 'Casual', 'Business', 'Anniversary', 'Other'];

  const combos = comboItems.filter((item) => item.selected);
  const bottles = bottleItems.filter((item) => (item.quantity || 0) > 0);
  const vipExtras = vipExtraItems.filter((item) => item.selected);
  const tableSelected = table.filter((t) => (t.quantity || 0) > 0);

  const totalPrice = vendor
    ? clubTotal({
        bottles: bottles as Record<string, unknown>[],
        combos: combos as Record<string, unknown>[],
        vipExtras: vipExtras as Record<string, unknown>[],
        table: tableSelected as Record<string, unknown>[],
      })
    : 0;

  // Persist the wizard draft on change.
  useEffect(() => {
    saveDraft<ClubDraft>({
      id: draftId,
      vertical: 'club',
      vendorId: (vendor?._id as string) || '',
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      step: page,
      date: date ? date.toISOString() : undefined,
      time,
      guests: parseInt(guestCount, 10) || 1,
      specialRequest,
      tableId: (initial?.tableId as string) || tableSelected[0]?._id,
      partPay,
      booking,
      vendorSnapshot: (vendor as ClubDraft['vendorSnapshot']) ?? null,
      comboItems: comboItems as Record<string, unknown>[],
      bottleItems: bottleItems as Record<string, unknown>[],
      vipExtraItems: vipExtraItems as Record<string, unknown>[],
      table: table as Record<string, unknown>[],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draftId,
    page,
    date,
    time,
    guestCount,
    specialRequest,
    partPay,
    booking,
    comboItems,
    bottleItems,
    vipExtraItems,
    table,
    vendor,
  ]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const error = validateClub({
        date,
        guests: guestCount,
        selectedBottles: bottles.length,
      });
      if (error) throw new Error(error);
      if (!vendor) return;

      const next = buildClubBooking({
        resId: draftId,
        user,
        vendor,
        draft: { id: draftId } as ClubDraft,
        combos: combos as Record<string, unknown>[],
        bottles: bottles as Record<string, unknown>[],
        vipExtras: vipExtras as Record<string, unknown>[],
        tableSelected: tableSelected as Record<string, unknown>[],
        proposedPayment,
        partPay,
        totalAmount: totalPrice,
      });
      next.date = date ? date.toISOString() : undefined;
      next.time = time;
      next.guests = parseInt(guestCount, 10) || 1;
      next.specialRequest = specialRequest;

      setBooking(next);
      saveDraft<ClubDraft>({
        id: draftId,
        vertical: 'club',
        vendorId: (vendor?._id as string) || '',
        createdAt: initial?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        step: page,
        date: next.date as string | undefined,
        time,
        guests: parseInt(guestCount, 10) || 1,
        specialRequest,
        tableId: tableSelected[0]?._id,
        partPay,
        booking: next,
        vendorSnapshot: (vendor as ClubDraft['vendorSnapshot']) ?? null,
        comboItems: comboItems as Record<string, unknown>[],
        bottleItems: bottleItems as Record<string, unknown>[],
        vipExtraItems: vipExtraItems as Record<string, unknown>[],
        table: table as Record<string, unknown>[],
      });
      toast.success('Reservation added successfully!');
      return true;
    } catch (error) {
      toast.error(
        (error as { message?: string }).message || 'Failed to submit reservation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReservationContext.Provider
      value={{
        draftId,
        comboItems,
        setComboItems,
        bottleItems,
        setBottleItems,
        vipExtraItems,
        setVipExtraItems,
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
        table,
        setTable,
        tableId: (initial?.tableId as string) || tableSelected[0]?._id,
        vendor,
        setVendor,
        handleSubmit,
        isLoading,
        totalPrice,
        setProposedPayment,
        proposedPayment,
        booking,
        setPartPay,
        partPay,
        tableSelected,
        setLoading,
        setComboLoading,
        setBottlesLoading,
        setTableLoading,
        loading,
        comboLoading,
        bottlesLoading,
        tableLoading,
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
