import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { DateDropdown } from '@/components/DateDropdown';
import { GuestDropdown } from '@/components/GuestDropdown';
import { TimeDropdown } from '@/components/TimeDropdown';
import {
  TAB_TO_VERTICAL,
  VENUE_SEARCH_LABEL,
  VENUE_SEARCH_PLACEHOLDER,
  VENUE_TIME_SLOTS,
  type VenueTab,
} from '../config/venue.config';
import { VenueSearchDropdown } from './VenueSearchDropdown';
import {
  buildVenueSearchUrl,
  clearRecentSearches,
  deleteRecentSearch,
  getRecentSearches,
  getVenueUserLocation,
  saveRecentSearch,
} from './venueSearch.utils';

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
}

interface VenueSearchBarProps {
  activeTab: VenueTab;
  onSearch?: (data: {
    query?: string;
    tab?: string;
    date?: Date | null;
    time?: string | null;
    guests?: number;
  }) => void;
}

/** Hero search bar (date / time / guests / live suggestions). */
export const VenueSearchBar = ({ activeTab, onSearch }: VenueSearchBarProps) => {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestCounts>({ adults: 2, children: 0, infants: 0 });
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const vendorType = TAB_TO_VERTICAL[activeTab];
  const userLocation = getVenueUserLocation();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsFocused(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const submit = useCallback(
    (term?: string) => {
      const q = (term !== undefined ? term : inputValue).trim();
      saveRecentSearch(q);
      setRecentSearches(getRecentSearches());
      setInputValue(q);
      setIsFocused(false);

      const totalGuests = guests.adults + guests.children + guests.infants;
      const url = buildVenueSearchUrl({
        q,
        type: vendorType,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        time: time || undefined,
        guests: totalGuests,
      });

      if (onSearch) onSearch({ query: q, tab: activeTab, date, time, guests: totalGuests });
      navigate(url);
    },
    [inputValue, guests, date, time, vendorType, activeTab, navigate, onSearch]
  );

  return (
    <div className="bg-white z-50 absolute top-6 sm:top-15 w-full sm:w-full mx-auto left-0 right-0 rounded-2xl lg:rounded-full justify-center mb-8 shadow-[0px_34px_10px_0px_rgba(122,122,122,0.00)] outline-2 outline-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div
          className="flex flex-col border-b py-2 sm:py-4 px-4 sm:px-6 sm:border-b-0 sm:border-r border-gray-200 col-span-1 sm:col-span-2 lg:col-span-1 relative"
          ref={wrapperRef}
        >
          <label className="text-xs text-text-secondary text-left">
            {VENUE_SEARCH_LABEL[activeTab]}
          </label>

          <div className="flex items-center gap-1.5 transition-colors">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={inputValue}
              placeholder={VENUE_SEARCH_PLACEHOLDER[activeTab]}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
                if (e.key === 'Escape') setIsFocused(false);
              }}
              className="w-full text-[10px] focus:outline-none text-text-primary placeholder:text-[14px] placeholder:text-text-secondary text-sm sm:text-base bg-transparent py-1"
            />
            {inputValue && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInputValue('')}
                className="text-gray-400 hover:text-gray-700 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <VenueSearchDropdown
            inputValue={inputValue}
            isFocused={isFocused}
            activeVertical={vendorType}
            userLocation={userLocation}
            recentSearches={recentSearches}
            onSelect={(term) => submit(term)}
            onSubmit={(term) => submit(term)}
            onDeleteRecent={(term) => {
              deleteRecentSearch(term);
              setRecentSearches(getRecentSearches());
            }}
            onClearRecent={() => {
              clearRecentSearches();
              setRecentSearches([]);
            }}
          />
        </div>

        <div className="grid grid-cols-2 col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="flex flex-col justify-center py-2 sm:py-4 px-4 sm:px-6 border-b sm:border-b-0 border-r border-gray-200">
            <label className="text-xs text-text-secondary text-left">Date</label>
            <DateDropdown selectedDate={date} onChange={(d) => setDate(d)} />
          </div>

          <div className="flex flex-col z-50 justify-center py-2 sm:py-4 px-4 sm:px-6 border-b sm:border-b-0 lg:border-r border-gray-200">
            <label className="text-xs text-text-secondary text-left">Time</label>
            <TimeDropdown
              selectedTime={time}
              slots={VENUE_TIME_SLOTS[activeTab]}
              onChange={setTime}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="flex flex-col justify-center py-2 sm:py-4 px-4 sm:px-6 sm:border-b-0 border-r border-gray-200">
            <label className="text-xs text-text-secondary text-left">Guests</label>
            <GuestDropdown onChange={(counts) => setGuests(counts)} />
          </div>
          <div className="flex items-center justify-center py-2 sm:py-1 px-4 sm:px-1 sm:justify-end w-full">
            <button
              type="button"
              onClick={() => submit()}
              className={`flex items-center gap-2 cursor-pointer text-white rounded-full px-6 sm:h-full py-3 transition w-full sm:w-auto justify-center ${
                activeTab === 'restaurants'
                  ? 'bg-gradient-to-b from-[#0A6C6D] to-[#08577C] hover:from-[#084F4F] hover:to-[#064E5C]'
                  : 'bg-gradient-to-b from-blue-800 to-violet-500 hover:from-blue-900 hover:to-violet-600'
              }`}
            >
              <FiSearch className="w-5 h-5" />
              <span className="text-sm sm:text-base">Search</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
