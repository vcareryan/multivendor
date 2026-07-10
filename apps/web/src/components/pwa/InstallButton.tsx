'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * "Install App" button. Registers the service worker and captures the browser's
 * `beforeinstallprompt` event so a tap triggers the NATIVE install dialog
 * directly — no "Add to Home Screen" menu hunting.
 *
 * The button only appears when the browser reports the app is installable
 * (Chrome/Edge/Android). It hides once installed or when already running as an
 * installed app. iOS Safari does not support programmatic install, so nothing
 * shows there (that platform requires the manual Share → Add to Home Screen).
 */
export function InstallButton({ className = '' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setHidden(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setHidden(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setHidden(true);
    setDeferred(null);
  }

  return (
    <button
      type="button"
      onClick={install}
      aria-label="Install app"
      className={`inline-flex items-center gap-1.5 rounded-theme border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      Install App
    </button>
  );
}
