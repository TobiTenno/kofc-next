'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
};

const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
};

export const PwaInstallHint = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    try {
      if (sessionStorage.getItem('pwa-install-dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore
    }

    const onBeforeInstall = (event: Event): void => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIosSafari()) {
      setShowIosTip(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const dismiss = (): void => {
    setDismissed(true);
    setDeferred(null);
    setShowIosTip(false);
    try {
      sessionStorage.setItem('pwa-install-dismissed', '1');
    } catch {
      // ignore
    }
  };

  const install = async (): Promise<void> => {
    if (!deferred) {
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (dismissed || isStandalone()) {
    return null;
  }

  if (!deferred && !showIosTip) {
    return null;
  }

  return (
    <div className='fixed bottom-3 right-3 z-[190] w-[min(100%-1.5rem,20rem)] rounded-lg border bg-background px-3 py-2 text-sm shadow-lg'>
      {deferred ? (
        <div className='grid gap-2'>
          <p>Install this app on your device for quicker access.</p>
          <div className='flex gap-2'>
            <button
              type='button'
              className='rounded bg-blue-900 px-3 py-1 text-white'
              onClick={() => void install()}
            >
              Install
            </button>
            <button
              type='button'
              className='rounded border px-3 py-1'
              onClick={dismiss}
            >
              Not now
            </button>
          </div>
        </div>
      ) : (
        <div className='grid gap-2'>
          <p>
            Install: tap Share, then <strong>Add to Home Screen</strong>.
          </p>
          <button
            type='button'
            className='w-fit rounded border px-3 py-1'
            onClick={dismiss}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
