'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { GalleryBackLink } from '@/components/galleries/GalleryBackLink';
import { GalleryGrid } from '@/components/galleries/GalleryGrid';
import { GalleryUploadForm } from '@/components/galleries/GalleryUploadForm';

type GalleryDetail = {
  id: string;
  title: string;
  description: string | null;
  allowMemberUploads: boolean;
  updatedAt: string;
};

type GalleryAsset = {
  id: string;
  filename: string;
  capturedAt: string | null;
};

export const GalleryDetail = () => {
  const params = useParams<{ id: string }>();
  const galleryId = params.id;

  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);

    const response = await fetch(`/api/members/galleries/${galleryId}`);
    if (response.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      gallery?: GalleryDetail;
      assets?: GalleryAsset[];
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? 'Could not load gallery');
      setLoading(false);
      return;
    }

    setGallery(payload.gallery ?? null);
    setAssets(payload.assets ?? []);
    setLoading(false);
  }, [galleryId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p>Loading…</p>;
  }

  if (notFound || !gallery) {
    return (
      <div className='grid gap-4'>
        <GalleryBackLink href='/members/galleries'>
          All galleries
        </GalleryBackLink>
        <p>{error ?? 'Gallery not found.'}</p>
      </div>
    );
  }

  return (
    <div className='grid gap-6'>
      <div className='grid gap-2'>
        <GalleryBackLink href='/members/galleries'>
          All galleries
        </GalleryBackLink>
        <h1 className='text-2xl font-bold'>{gallery.title}</h1>
        {gallery.description ? (
          <p className='text-muted-foreground'>{gallery.description}</p>
        ) : null}
      </div>

      {error ? <p className='text-red-700'>{error}</p> : null}

      <GalleryGrid assets={assets} />

      {gallery.allowMemberUploads ? (
        <GalleryUploadForm
          galleryId={gallery.id}
          onUploaded={() => void load()}
        />
      ) : null}
    </div>
  );
};
