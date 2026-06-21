'use client';

import { Button, Modal, useOverlayState } from '@heroui/react';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import {
  type GalleryAsset,
  galleryAssetUrl,
} from '@/components/galleries/gallery-asset-url';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useHorizontalSwipe } from '@/hooks/use-horizontal-swipe';

type GalleryLightboxProps = {
  assets: GalleryAsset[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
};

const ChevronLeftIcon = () => (
  <svg
    viewBox='0 0 24 24'
    className='size-5 shrink-0'
    aria-hidden
    fill='currentColor'
  >
    <path d='M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    viewBox='0 0 24 24'
    className='size-5 shrink-0'
    aria-hidden
    fill='currentColor'
  >
    <path d='M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z' />
  </svg>
);

export const GalleryLightbox = ({
  assets,
  activeIndex,
  onActiveIndexChange,
}: GalleryLightboxProps) => {
  const isOpen = activeIndex !== null && assets.length > 0;
  const index = activeIndex ?? 0;
  const asset = assets[index];

  const overlay = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) {
        onActiveIndexChange(null);
      }
    },
  });

  useBodyScrollLock(isOpen);

  const goPrev = useCallback((): void => {
    if (assets.length === 0) {
      return;
    }
    onActiveIndexChange((index - 1 + assets.length) % assets.length);
  }, [assets.length, index, onActiveIndexChange]);

  const goNext = useCallback((): void => {
    if (assets.length === 0) {
      return;
    }
    onActiveIndexChange((index + 1) % assets.length);
  }, [assets.length, index, onActiveIndexChange]);

  const swipe = useHorizontalSwipe({
    enabled: isOpen && assets.length > 1,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, isOpen]);

  if (!isOpen || !asset) {
    return null;
  }

  const showNav = assets.length > 1;

  return (
    <Modal state={overlay}>
      <Modal.Backdrop
        variant='blur'
        className='fixed inset-0 z-50 bg-black/90 p-0 sm:p-4'
      >
        <Modal.Container
          placement='center'
          size='cover'
          className='flex h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 shadow-none sm:h-auto sm:max-h-[95dvh] sm:max-w-[min(100vw,1200px)] sm:p-0'
        >
          <Modal.Dialog
            aria-label={`Photo ${index + 1} of ${assets.length}`}
            className='flex h-full min-h-0 flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] outline-none sm:gap-3 sm:px-4'
            {...swipe}
          >
            <div className='flex shrink-0 items-center justify-between gap-2 text-white'>
              <p className='min-w-0 truncate text-sm font-medium'>
                {asset.filename}
              </p>
              <div className='flex shrink-0 items-center gap-2'>
                {showNav ? (
                  <span className='text-sm text-white/70'>
                    {index + 1} / {assets.length}
                  </span>
                ) : null}
                <Modal.CloseTrigger
                  aria-label='Close gallery'
                  className='!static min-h-11 min-w-11 touch-manipulation rounded-lg border border-white/30 bg-black/50 px-3 text-sm font-medium text-white hover:bg-black/65 active:bg-black/75'
                >
                  Close
                </Modal.CloseTrigger>
              </div>
            </div>

            <div className='relative flex min-h-0 flex-1 items-center justify-center'>
              {showNav ? (
                <>
                  <button
                    type='button'
                    aria-label='Previous photo'
                    className='absolute inset-y-0 left-0 z-10 w-[28%] touch-manipulation sm:hidden'
                    onClick={goPrev}
                  />
                  <button
                    type='button'
                    aria-label='Next photo'
                    className='absolute inset-y-0 right-0 z-10 w-[28%] touch-manipulation sm:hidden'
                    onClick={goNext}
                  />
                </>
              ) : null}

              {showNav ? (
                <Button
                  aria-label='Previous photo'
                  className='absolute top-1/2 left-1 z-20 hidden -translate-y-1/2 sm:inline-flex'
                  isIconOnly
                  onPress={goPrev}
                  size='lg'
                  variant='secondary'
                >
                  <ChevronLeftIcon />
                </Button>
              ) : null}

              <div className='flex min-h-0 w-full max-w-full items-center justify-center px-1 sm:px-12'>
                <Image
                  src={galleryAssetUrl(asset.id, 'fullsize')}
                  alt={asset.filename}
                  width={2400}
                  height={1800}
                  unoptimized
                  className='max-h-[min(62dvh,900px)] w-auto max-w-full touch-pan-y object-contain sm:max-h-[min(72dvh,900px)]'
                  draggable={false}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>

              {showNav ? (
                <Button
                  aria-label='Next photo'
                  className='absolute top-1/2 right-1 z-20 hidden -translate-y-1/2 sm:inline-flex'
                  isIconOnly
                  onPress={goNext}
                  size='lg'
                  variant='secondary'
                >
                  <ChevronRightIcon />
                </Button>
              ) : null}
            </div>

            {showNav ? (
              <div className='flex shrink-0 items-center justify-center gap-4 sm:hidden'>
                <Button
                  aria-label='Previous photo'
                  className='min-h-11 min-w-11 touch-manipulation'
                  isIconOnly
                  onPress={goPrev}
                  size='lg'
                  variant='secondary'
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  aria-label='Next photo'
                  className='min-h-11 min-w-11 touch-manipulation'
                  isIconOnly
                  onPress={goNext}
                  size='lg'
                  variant='secondary'
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            ) : null}

            <div className='flex shrink-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {assets.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type='button'
                  aria-label={`View ${item.filename}`}
                  aria-current={itemIndex === index ? 'true' : undefined}
                  className={[
                    'relative size-16 shrink-0 snap-start overflow-hidden rounded-md border-2 touch-manipulation sm:size-14',
                    itemIndex === index
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-60 active:opacity-90',
                  ].join(' ')}
                  onClick={() => onActiveIndexChange(itemIndex)}
                >
                  <Image
                    src={galleryAssetUrl(item.id, 'preview')}
                    alt=''
                    fill
                    unoptimized
                    className='object-cover'
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
