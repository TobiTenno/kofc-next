'use client';

import { useEffect, useState } from 'react';

export const PwaRegister = () => {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: null | ServiceWorker = null;

    const onControllerChange = (): void => {
      // New SW took control — reload once to get fresh assets.
      location.reload();
    };

    const onStateChange = (): void => {
      if (
        installingWorker?.state === 'installed'
        && navigator.serviceWorker.controller
      ) {
        setUpdateReady(true);
      }
    };

    const onUpdateFound = (): void => {
      installingWorker = registration?.installing ?? null;
      if (!installingWorker) {
        return;
      }
      installingWorker.addEventListener('statechange', onStateChange);
    };

    const bindRegistration = (reg: ServiceWorkerRegistration): void => {
      registration = reg;

      if (reg.waiting) {
        setUpdateReady(true);
      }

      // Listener removed in effect cleanup via `registration`.
      // eslint-disable-next-line @eslint-react/web-api-no-leaked-event-listener -- cleaned up below
      reg.addEventListener('updatefound', onUpdateFound);
    };

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(bindRegistration)
      .catch(() => {});

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
      registration?.removeEventListener('updatefound', onUpdateFound);
      installingWorker?.removeEventListener('statechange', onStateChange);
    };
  }, []);

  const applyUpdate = (): void => {
    void navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      // skipWaiting already in sw install; claim + controllerchange reloads.
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      location.reload();
    });
  };

  if (!updateReady) {
    return null;
  }

  return (
    <div className='fixed bottom-3 left-1/2 z-[200] w-[min(100%-1.5rem,24rem)] -translate-x-1/2 rounded-lg border bg-background px-3 py-2 text-sm shadow-lg'>
      <div className='flex items-center justify-between gap-3'>
        <span>App update ready.</span>
        <button
          className='rounded bg-blue-900 px-3 py-1 text-white'
          onClick={applyUpdate}
          type='button'
        >
          Reload
        </button>
      </div>
    </div>
  );
};
