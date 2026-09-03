import { Building2, ChevronDown, Clock } from 'lucide-react';
import { InputField, SectionCard, SelectField, TimeInput, ToggleSwitch } from './part/settingsComp';

interface Hours {
  start: string;
  end: string;
  enabled: boolean;
}

interface OpeningHoursRowProps {
  day: string;
  hours: Hours;
  onUpdateTime: (day: string, field: 'start' | 'end', value: string) => void;
  onToggle: (day: string) => void;
}

const OpeningHoursRow = ({ day, hours, onUpdateTime, onToggle }: OpeningHoursRowProps) => (
  <div className="flex items-center gap-4">
    <div className="w-24 text-sm text-gray-700">{day}</div>

    <div className="flex items-center gap-2 flex-1">
      <TimeInput
        value={hours.start}
        onChange={(e) => onUpdateTime(day, 'start', e.target.value)}
        disabled={!hours.enabled}
      />

      <span className="text-gray-500">to</span>

      <TimeInput
        value={hours.end}
        onChange={(e) => onUpdateTime(day, 'end', e.target.value)}
        disabled={!hours.enabled}
      />
    </div>

    <ToggleSwitch enabled={hours.enabled} onToggle={() => onToggle(day)} />
  </div>
);

// Opening Hours Component
interface OpeningHoursProps {
  openingHours: Record<string, Hours>;
  updateTime: (day: string, field: 'start' | 'end', value: string) => void;
  toggleDayEnabled: (day: string) => void;
}

export const OpeningHours = ({ openingHours, updateTime, toggleDayEnabled }: OpeningHoursProps) => (
  <SectionCard title="Opening Hours">
    <div className="space-y-3">
      {Object.keys(openingHours).map((day) => (
        <OpeningHoursRow
          key={day}
          day={day}
          hours={openingHours[day]}
          onUpdateTime={updateTime}
          onToggle={toggleDayEnabled}
        />
      ))}
    </div>
  </SectionCard>
);

// Reservation Preferences Component
interface ReservationPreferencesProps {
  minGuests: string | number;
  setMinGuests: (value: number) => void;
  maxGuests: string | number;
  setMaxGuests: (value: number) => void;
  defaultDuration: string;
  setDefaultDuration: (value: string) => void;
  defaultCapacity: string | number;
  setDefaultCapacity: (value: number) => void;
  leadTime: string;
  setLeadTime: (value: string) => void;
  cutoffTime: string;
  setCutoffTime: (value: string) => void;
}

export const ReservationPreferences = ({
  minGuests,
  setMinGuests,
  maxGuests,
  setMaxGuests,
  defaultDuration,
  setDefaultDuration,
  defaultCapacity,
  setDefaultCapacity,
  leadTime,
  setLeadTime,
  cutoffTime,
  setCutoffTime,
}: ReservationPreferencesProps) => (
  <SectionCard title="Reservation Preferences">
    <div className="grid grid-cols-2 gap-6">
      <InputField
        label="Minimum Guests Per Booking"
        type="number"
        value={minGuests}
        onChange={(e) => setMinGuests(parseInt(e.target.value))}
        min="1"
      />

      <InputField
        label="Maximum Guests Per Booking"
        type="number"
        value={maxGuests}
        onChange={(e) => setMaxGuests(parseInt(e.target.value))}
        min="1"
      />

      <SelectField
        label="Default Reservation Duration"
        value={defaultDuration}
        onChange={(e) => setDefaultDuration(e.target.value)}
        options={['30 minutes', '1 hour', '1.5 hours', '2 hours', '3 hours']}
      />

      <InputField
        label="Default Capacity"
        type="number"
        value={defaultCapacity}
        onChange={(e) => setDefaultCapacity(parseInt(e.target.value))}
        min="1"
        helpText="Maximum number of guests at one time"
      />

      <SelectField
        label="Lead Time For Reservation"
        value={leadTime}
        onChange={(e) => setLeadTime(e.target.value)}
        options={[
          '30 minutes before',
          '1 hour before',
          '2 hours before',
          '4 hours before',
          '1 day before',
        ]}
        helpText="Minimum time before a reservation can be made"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cut-off Time for Same-day Bookings
        </label>
        <div className="relative">
          <input
            type="time"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <Clock className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          After this time, same-day bookings will not be accepted
        </p>
      </div>
    </div>
  </SectionCard>
);