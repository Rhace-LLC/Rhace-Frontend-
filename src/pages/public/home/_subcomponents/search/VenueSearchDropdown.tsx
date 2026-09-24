import { ArrowUpRight, Clock, Loader2, Search, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FaStar } from 'react-icons/fa6';
import { TYPE_CONFIG } from '@/utils/constants';
import { venueSearchService, type VenueSuggestion } from './venueSearch.service';
import { DEBOUNCE_MS, type VenueUserLocation } from './venueSearch.utils';
import type { VenueVertical } from '../config/venue.config';

interface VenueSearchDropdownProps {
  inputValue: string;
  isFocused: boolean;
  activeVertical?: VenueVertical;
  userLocation?: VenueUserLocation;
  onSelect: (term: string) => void;
  onSubmit: (term: string) => void;
  onDeleteRecent: (term: string) => void;
  onClearRecent: () => void;
  recentSearches: string[];
}

/** Live recent / trending / suggestions dropdown shared by the search bars. */
export const VenueSearchDropdown = ({
  inputValue,
  isFocused,
  activeVertical,
  userLocation,
  onSelect,
  onSubmit,
  onDeleteRecent,
  onClearRecent,
  recentSearches,
}: VenueSearchDropdownProps) => {
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [isSugLoading, setIsSugLoading] = useState(false);
  const [trending, setTrending] = useState<VenueSuggestion[]>([]);
  const [isTrendLoad, setIsTrendLoad] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsTrendLoad(true);
    venueSearchService
      .trending(activeVertical || undefined)
      .then(setTrending)
      .catch(() => {})
      .finally(() => setIsTrendLoad(false));
  }, [activeVertical]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputValue.trim().length < 1) {
      setSuggestions([]);
      setIsSugLoading(false);
      return;
    }
    setIsSugLoading(true);
    debounceRef.current = setTimeout(() => {
      venueSearchService
        .suggestions(inputValue, activeVertical || undefined, userLocation)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setIsSugLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, activeVertical, userLocation?.lat, userLocation?.lng]);

  if (!isFocused) return null;

  const showRecent = inputValue.trim().length === 0 && recentSearches.length > 0;
  const showTrending = inputValue.trim().length === 0 && !showRecent;
  const showSuggestions = inputValue.trim().length >= 1;

  return (
    <div className="absolute left-0 right-0 top-full w-full md:w-88 bg-white rounded-2xl shadow-2xl z-[999] max-h-80 overflow-y-auto">
      {showRecent && (
        <div>
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Recent
            </span>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearRecent}
              className="text-[10px] font-bold text-[#0A6C6D]"
            >
              Clear all
            </button>
          </div>
          {recentSearches.map((term) => (
            <div
              key={term}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(term)}
              className="flex items-center gap-2.5 px-4 py-4 hover:bg-gray-50 cursor-pointer group"
            >
              <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="text-sm text-start line-clamp-1 text-gray-700 flex-1 truncate">
                {term}
              </span>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRecent(term);
                }}
                className="text-gray-200 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showTrending && (
        <div>
          <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Trending
            </span>
          </div>
          {isTrendLoad ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
            </div>
          ) : (
            trending.slice(0, 6).map((v) => {
              const cfg = TYPE_CONFIG[(v.vendorType as 'restaurant' | 'hotel' | 'club') || 'restaurant'];
              const firstImage = v.profileImages?.[0];
              const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage?.url;
              return (
                <div
                  key={v._id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(v.businessName || '')}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-300">
                        {v.businessName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 justify-items-start min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.businessName}</p>
                    <p className="text-[11px] text-gray-400 capitalize">
                      {cfg?.singular} · {v.address?.split(',')[0]}
                    </p>
                  </div>
                  {v.rating && v.rating > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <FaStar className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-xs font-bold text-gray-700">{v.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showSuggestions && (
        <div>
          <div className="px-4 pt-2.5 pb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Suggestions
            </span>
          </div>
          {isSugLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((v) => {
              const cfg = TYPE_CONFIG[(v.vendorType as 'restaurant' | 'hotel' | 'club') || 'restaurant'];
              return (
                <div
                  key={v._id || v.text}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(v.text || v.businessName || '')}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-300">
                      {v.text?.[0] || v.businessName?.[0]}
                    </div>
                  </div>
                  <div className="flex-1 justify-items-start min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.text}</p>
                    <p className="text-[11px] text-gray-400 capitalize">
                      {cfg?.singular}
                      {v.label && v.label !== 'General' ? `${v.label}` : ''}
                    </p>
                  </div>
                  {v.rating && v.rating > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <FaStar className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-xs font-bold text-gray-700">{v.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <ArrowUpRight className="w-3 h-3 text-gray-200 group-hover:text-gray-400 shrink-0" />
                </div>
              );
            })
          ) : (
            <p className="px-3 py-4 text-center text-sm text-gray-400">
              No results for "{inputValue}"
            </p>
          )}
          {inputValue.trim() && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSubmit(inputValue)}
              className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50 cursor-pointer text-[#0A6C6D]"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                Search "<strong>{inputValue}</strong>"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
