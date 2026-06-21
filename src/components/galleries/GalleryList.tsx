'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type GallerySummary = {
  id: string;
  title: string;
  description: string | null;
  allowMemberUploads: boolean;
  updatedAt: string;
  assetCount: number;
  coverAssetId: string | null;
};

export const GalleryList = () => {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [canManageGalleries, setCanManageGalleries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/members/galleries')
      .then(async (response) => {
        const payload = (await response.json()) as {
          galleries?: GallerySummary[];
          canManageGalleries?: boolean;
          error?: string;
        };

        if (!response.ok) {
          setError(payload.error ?? 'Could not load galleries');
          return;
        }

        setGalleries(payload.galleries ?? []);
        setCanManageGalleries(payload.canManageGalleries ?? false);
      })
      .catch(() => {
        setError('Could not load galleries');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading galleries…</p>;
  }

  if (error) {
    return (
      <div className='grid gap-4'>
        <h1 className='text-2xl font-bold'>Photo Galleries</h1>
        <p className='text-red-700'>{error}</p>
      </div>
    );
  }

  return (
    <div className='grid gap-6'>
      <h1 className='text-2xl font-bold'>Photo Galleries</h1>
      {galleries.length === 0 ? (
        <div className='grid gap-3 text-muted-foreground'>
          <p>No galleries yet.</p>
          {canManageGalleries ? (
            <p>
              <Link
                href='/members/admin/galleries'
                className='font-medium text-blue-900 underline underline-offset-2'
              >
                Manage galleries
              </Link>{' '}
              to link an existing Immich album or create a new one.
            </p>
          ) : (
            <p>Ask a webmaster to add one from the admin galleries page.</p>
          )}
        </div>
      ) : (
        <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {galleries.map((gallery) => (
            <li key={gallery.id} className='border rounded overflow-hidden'>
              <Link href={`/members/galleries/${gallery.id}`} className='block'>
                <div className='relative aspect-video bg-muted flex items-center justify-center overflow-hidden'>
                  {gallery.coverAssetId ? (
                    <Image
                      src={`/api/members/galleries/assets/${gallery.coverAssetId}?size=preview`}
                      alt=''
                      fill
                      unoptimized
                      className='object-cover'
                    />
                  ) : (
                    <span className='text-sm text-muted-foreground'>
                      No photos
                    </span>
                  )}
                </div>
                <div className='p-3 grid gap-1'>
                  <h2 className='font-semibold'>{gallery.title}</h2>
                  {gallery.description ? (
                    <p className='text-sm text-muted-foreground line-clamp-2'>
                      {gallery.description}
                    </p>
                  ) : null}
                  <p className='text-xs text-muted-foreground'>
                    {gallery.assetCount} photo
                    {gallery.assetCount === 1 ? '' : 's'}
                    {gallery.allowMemberUploads ? ' · uploads open' : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
