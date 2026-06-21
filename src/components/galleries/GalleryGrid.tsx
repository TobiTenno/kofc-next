'use client';

import Image from 'next/image';
import { useState } from 'react';
import { GalleryLightbox } from '@/components/galleries/GalleryLightbox';
import {
  type GalleryAsset,
  galleryAssetUrl,
} from '@/components/galleries/gallery-asset-url';

type GalleryGridProps = {
  assets: GalleryAsset[];
};

export const GalleryGrid = ({ assets }: GalleryGridProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (assets.length === 0) {
    return <p className='text-muted-foreground'>No photos yet.</p>;
  }

  return (
    <>
      <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
        {assets.map((asset, index) => (
          <li key={asset.id} className='grid gap-1'>
            <button
              type='button'
              className='relative block aspect-square min-h-11 w-full overflow-hidden rounded border bg-muted text-left touch-manipulation active:opacity-90'
              onClick={() => setActiveIndex(index)}
            >
              <Image
                src={galleryAssetUrl(asset.id, 'preview')}
                alt={asset.filename}
                fill
                unoptimized
                sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw'
                className='object-cover'
              />
            </button>
            <span className='truncate text-xs' title={asset.filename}>
              {asset.filename}
            </span>
          </li>
        ))}
      </ul>

      <GalleryLightbox
        assets={assets}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  );
};
