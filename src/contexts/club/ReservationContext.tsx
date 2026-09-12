
import { useAuth } from '@/contexts/AuthContext';
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import type { AuthUser } from '@/types';

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

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [bottleItems, setBottleItems] = useState<BottleItem[]>([]);
  const [vipExtraItems, setVipExtraItems] = useState<VipExtraItem[]>([]);
  const [guestCount, setGuestCount] = useState('1');
  const [specialRequest, setSpecialRequest] = useState('');
  const [activeTab, setActiveTab] = useState('Starters');
  const [page, setPage] = useState(0);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [table, setTable] = useState<TableItem[]>([]);
  const [vendor, setVendor] = useState<VendorState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [proposedPayment, setProposedPayment] = useState(0);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [partPay, setPartPay] = useState(false);
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
    ? bottles.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0) +
      combos.reduce((total, item) => total + (item.setPrice || 0), 0) +
      vipExtras.reduce((total, item) => total + (item.price || 0), 0) +
      tableSelected?.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0)
    : 0;

  console.log(totalPrice);
  const generateId = () => {
    return Date.now().toString(36).substring(0, 8).toUpperCase();
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      if (!date || !guestCount) {
        throw new Error('Please fill in all required fields.');
      }

      if (bottles.length < 1) {
        throw new Error('Please select a Bottle of Drink to continue!');
      }

      const parsedGuestCount = parseInt(guestCount, 10);
      if (!vendor) return;

      const reservationData = {
        resId: generateId(),
        reservationType: 'club',
        customerName: `${user?.firstName} ${user?.lastName}`.trim(),
        customerEmail: user?.email,
        customerId: user?._id,
        date: date.toISOString(),
        time,
        guests: parsedGuestCount,
        specialRequest,
        combos: combos.map((item) => item._id),
        drinks: bottles.map((item) => ({
          drink: item._id,
          quantity: item.quantity || 1,
        })),
        vipExtras: vipExtras.filter((item) => item.selected),
        proposedPayment,
        partPaid: partPay,
        totalAmount: partPay ? totalPrice / 2 : totalPrice,
        vendor: vendor?._id,
        businessName: vendor?.businessName,
        table: tableSelected?.map((item) => ({
          _id: item._id,
          quantity: item.quantity || 1,
        })),
        location: vendor?.address,
        image: vendor?.profileImages?.[0],
      };

      const resDatas = JSON.parse(localStorage.getItem('resData') || '[]');
      localStorage.setItem('resData', JSON.stringify([...resDatas, reservationData]));
      setBooking(reservationData as Record<string, unknown>);
      toast.success('Reservation added successfully!');
      return true;
    } catch (error) {
      console.error('Error submitting reservation:', error);
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
