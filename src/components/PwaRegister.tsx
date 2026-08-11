'use client';

import { useEffect, useState } from 'react';

export const PwaRegister = () => {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    const onControllerChange = (): void => {
      // New SW took control — reload once to get fresh assets.
      window.location.reload();
    };

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;

        if (reg.waiting) {
          setUpdateReady(true);
        }

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) {
            return;
          }
          worker.addEventListener('statechange', () => {
            if (
              worker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
      void registration;
    };
  }, []);

  const applyUpdate = (): void => {
    void navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      // skipWaiting already in sw install; claim + controllerchange reloads.
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
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
          type='button'
          className='rounded bg-blue-900 px-3 py-1 text-white'
          onClick={applyUpdate}
        >
          Reload
        </button>
      </div>
    </div>
  );
};
