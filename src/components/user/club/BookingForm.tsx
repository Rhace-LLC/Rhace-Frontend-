import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import DatePicker from '../ui/datepicker';
import { TimePicker } from '../ui/timepicker';
import { GuestPicker } from '../ui/guestpicker';
import { TablePicker, type TableOption } from '../ui/tablepicker';
import { createDraft } from '@/features/reservation/draft/draftStore';
import type { ClubDraft } from '@/features/reservation/types';

interface BookingFormProps {
  id?: string;
  tables?: TableOption[];
  loading?: boolean;
}

const BookingForm = ({ id, tables, loading }: BookingFormProps) => {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('1');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [table, setTable] = useState<any>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!date || !time) {
        throw new Error('Date and Time are required');
      }
      const draft = createDraft<ClubDraft>({
        vertical: 'club',
        vendorId: id ?? '',
        step: 0,
        date: date.toISOString(),
        time,
        guests: parseInt(guests, 10) || 1,
        specialRequest: '',
        tableId: table?._id,
        comboItems: [],
        bottleItems: [],
        vipExtraItems: [],
        table: [],
        partPay: false,
        vendorSnapshot: null,
        booking: null,
      });
      navigate(`/clubs/${id}/reservations?draft=${draft.id}`);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e2 = err as any;
      if (e2) {
        const errorMessage =
          e2.response?.data?.message || e2.message || 'An unexpected error occurred';
        toast.error(errorMessage);
      } else if (e2 instanceof Error) {
        toast.error(e2.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTable = (v: any) => {
    console.log(v);
    setTable(v);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="flex flex-col md:flex-row w-full gap-4">
        <DatePicker title="Date" value={date} onChange={setDate} />
        <TimePicker
          title="Time"
          value={time}
          onChange={setTime}
          slot={[
            '09:00 PM',
            '09:30 PM',
            '10:00 PM',
            '10:30 PM',
            '11:00 PM',
            '11:30 PM',
            '12:00 AM',
            '12:30 AM',
            '01:00 AM',
            '01:30 AM',
            '02:00 AM',
            '02:30 AM',
            '03:00 AM',
          ]}
        />
      </div>
      <TablePicker
        chevron
        loading={loading}
        tables={tables}
        value={table?.name}
        onChange={(value) => handleTable(value)}
      />
      <GuestPicker chevron value={guests} onChange={setGuests} hideChildren hideInfants />
      <Button
        type="submit"
        disabled={!date || !time || isLoading || !table}
        className="w-full rounded-xl h-10 py-6 bg-[#0A6C6D] hover:bg-[0A6C6D]/50"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" /> Loading
          </>
        ) : (
          'Reserve Table'
        )}
      </Button>
    </form>
  );
};

export default BookingForm;
