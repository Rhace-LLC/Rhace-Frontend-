import { useEffect, useState } from 'react';
import { VENUE_TABS, isVenueTab, type VenueTab } from '../config/venue.config';

const STORAGE_KEY = 'activeTab';

/** Persisted homepage tab. Reads localStorage once on mount. */
export const useActiveTab = (initial: VenueTab = 'restaurants') => {
  const [activeTab, setActiveTabState] = useState<VenueTab>(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isVenueTab(saved)) setActiveTabState(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setActiveTab = (tab: VenueTab) => {
    setActiveTabState(tab);
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, tab);
      } catch {
        /* ignore */
      }
    }
  };

  return { activeTab, setActiveTab, tabs: VENUE_TABS };
};
