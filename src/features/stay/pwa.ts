import { useEffect, useState } from 'react';

const LAST_ROOM_KEY = 'rhace_last_room_token';

/** The room QR token this device last opened (for the installed app's start page). */
export function getLastRoomToken(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

function rememberRoomToken(token: string): void {
  try {
    localStorage.setItem(LAST_ROOM_KEY, token);
  } catch {
    // Storage blocked: the installed app will ask the guest to scan again.
  }
}

function upsertHeadTag(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const el = create();
  el.dataset.stayPwa = '1';
  document.head.appendChild(el);
  return el;
}

/**
 * Phase 8: make the guest stay app installable. Adds the stay manifest,
 * theme colour and iOS home-screen tags while the stay app is mounted, and
 * registers the `/stay/`-scoped service worker in production builds (never
 * in dev, so a cached shell can't hide code changes).
 */
export function useStayPwa(roomToken: string | undefined): void {
  useEffect(() => {
    if (roomToken) rememberRoomToken(roomToken);
  }, [roomToken]);

  useEffect(() => {
    const tags = [
      upsertHeadTag('link[rel="manifest"]', () => {
        const l = document.createElement('link');
        l.rel = 'manifest';
        l.href = '/stay-manifest.webmanifest';
        return l;
      }),
      upsertHeadTag('meta[name="theme-color"]', () => {
        const m = document.createElement('meta');
        m.name = 'theme-color';
        m.content = '#0b2926';
        return m;
      }),
      upsertHeadTag('meta[name="apple-mobile-web-app-capable"]', () => {
        const m = document.createElement('meta');
        m.name = 'apple-mobile-web-app-capable';
        m.content = 'yes';
        return m;
      }),
      upsertHeadTag('link[rel="apple-touch-icon"]', () => {
        const l = document.createElement('link');
        l.rel = 'apple-touch-icon';
        l.href = '/stay-icons/apple-touch-icon.png';
        return l;
      }),
    ];

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/stay-sw.js', { scope: '/stay/' }).catch(() => {
        // Installability is a nicety; the app works without the worker.
      });
    }

    return () => {
      // Only remove what this hook added (the main site has no manifest).
      for (const tag of tags) if (tag.dataset.stayPwa) tag.remove();
    };
  }, []);
}

/** Live online/offline flag for the guest app's offline banner. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
