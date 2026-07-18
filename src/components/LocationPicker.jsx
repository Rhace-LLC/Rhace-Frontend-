import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export const LocationPicker = ({ requestLocation, setCity, onClose, updateFilter }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchCities = useCallback(async (q) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!r.ok) throw new Error('Search failed');
      const data = await r.json();
      setResults(
        data.map((item) => ({
          displayName: item.display_name,
          lat: item.lat,
          lng: item.lon,
          city: item.address?.city || item.address?.town || item.address?.state_district || item.address?.state || '',
          country: item.address?.country || '',
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(val), DEBOUNCE_MS);
  };

  const handleSelectCity = (item) => {
    setCity(item.city, parseFloat(item.lat), parseFloat(item.lng), item.country);
    if (updateFilter) updateFilter('city', item.city);
    setQuery('');
    setResults([]);
    onClose?.();
  };

  const handleUseCurrentLocation = () => {
    requestLocation();
    onClose?.();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 space-y-2">
      <button
        onClick={handleUseCurrentLocation}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#0A6C6D] hover:bg-[#0A6C6D]/5 transition-colors"
      >
        <Navigation className="w-4 h-4" />
        Use my current location
      </button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search city..."
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6C6D] focus:ring-1 focus:ring-[#0A6C6D]/20"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      )}

      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto space-y-0.5">
          {results.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => handleSelectCity(item)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span className="line-clamp-2 text-gray-700">{item.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim().length >= MIN_QUERY_LENGTH && !isLoading && results.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No cities found</p>
      )}
    </div>
  );
};
