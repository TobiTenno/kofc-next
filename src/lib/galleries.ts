import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { gallerySubmissions, photoGalleries } from '@/db/schema';
import {
  addAssetsToImmichAlbum,
  assertGalleryUploadAsset,
  createImmichAlbum,
  getImmichAlbum,
  getImmichAlbumWithAssets,
  ImmichUploadValidationError,
  isImmichConfigured,
} from '@/lib/immich/client';
import { createId } from '@/lib/utils';

export type GalleryRecord = typeof photoGalleries.$inferSelect;

export const listActiveGalleries = async (): Promise<GalleryRecord[]> =>
  db
    .select()
    .from(photoGalleries)
    .where(eq(photoGalleries.active, true))
    .orderBy(desc(photoGalleries.updatedAt));

export const listAllGalleries = async (): Promise<GalleryRecord[]> =>
  db.select().from(photoGalleries).orderBy(desc(photoGalleries.updatedAt));

export const getGalleryById = async (
  id: string,
): Promise<GalleryRecord | null> => {
  const row = await db.query.photoGalleries.findFirst({
    where: eq(photoGalleries.id, id),
  });

  return row ?? null;
};

export const createGallery = async (options: {
  allowMemberUploads: boolean;
  createdBy: string;
  description?: string;
  immichAlbumId?: string;
  title: string;
}): Promise<GalleryRecord> => {
  if (!isImmichConfigured()) {
    throw new Error('Immich is not configured');
  }

  const now = new Date();

  if (options.immichAlbumId) {
    const linked = await db.query.photoGalleries.findFirst({
      where: eq(photoGalleries.immichAlbumId, options.immichAlbumId),
    });
    if (linked) {
      throw new Error('That Immich album is already linked to a gallery');
    }
  }

  const immichAlbum = options.immichAlbumId
    ? await getImmichAlbum(options.immichAlbumId)
    : await createImmichAlbum({
        albumName: options.title,
        description: options.description,
      });

  const record: GalleryRecord = {
    active: true,
    allowMemberUploads: options.allowMemberUploads,
    createdAt: now,
    createdBy: options.createdBy,
    description: options.description ?? null,
    id: createId(),
    immichAlbumId: immichAlbum.id,
    title: options.title,
    updatedAt: now,
  };

  await db.insert(photoGalleries).values(record);
  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'gallery.create',
    actorMembershipNumber: options.createdBy,
    metadata: { id: record.id, immichAlbumId: record.immichAlbumId },
    summary: `Created gallery “${record.title}”`,
  });
  return record;
};

export const updateGallery = async (
  id: string,
  patch: Partial<
    Pick<
      GalleryRecord,
      'active' | 'allowMemberUploads' | 'description' | 'title'
    >
  >,
  actorMembershipNumber?: null | string,
): Promise<GalleryRecord | null> => {
  const existing = await getGalleryById(id);
  if (!existing) {
    return null;
  }

  const now = new Date();
  await db
    .update(photoGalleries)
    .set({ ...patch, updatedAt: now })
    .where(eq(photoGalleries.id, id));

  const updated = {
    ...existing,
    ...patch,
    updatedAt: now,
  };

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'gallery.update',
    actorMembershipNumber,
    metadata: { id, patch },
    summary: `Updated gallery “${updated.title}”`,
  });

  return updated;
};

export const completeGalleryUpload = async (options: {
  assetId: string;
  filename: string;
  gallery: GalleryRecord;
  membershipNumber: string;
}): Promise<{ assetId: string }> => {
  if (!options.gallery.active) {
    throw new Error('Gallery is not active');
  }

  if (!options.gallery.allowMemberUploads) {
    throw new Error('Uploads are disabled for this gallery');
  }

  const existingSubmission = await db.query.gallerySubmissions.findFirst({
    where: eq(gallerySubmissions.immichAssetId, options.assetId),
  });

  if (existingSubmission) {
    throw new ImmichUploadValidationError(
      'Asset is already linked to a gallery',
    );
  }

  await assertGalleryUploadAsset(options.assetId);

  await addAssetsToImmichAlbum(options.gallery.immichAlbumId, [
    options.assetId,
  ]);

  await db.insert(gallerySubmissions).values({
    createdAt: new Date(),
    filename: options.filename,
    galleryId: options.gallery.id,
    id: createId(),
    immichAssetId: options.assetId,
    membershipNumber: options.membershipNumber,
  });

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'gallery.upload',
    actorMembershipNumber: options.membershipNumber,
    metadata: {
      assetId: options.assetId,
      filename: options.filename,
      galleryId: options.gallery.id,
    },
    summary: `Uploaded photo to “${options.gallery.title}”`,
  });

  return { assetId: options.assetId };
};

export const getGalleryWithImmichAssets = async (id: string) => {
  const gallery = await getGalleryById(id);
  if (!gallery?.active) {
    return null;
  }

  const album = await getImmichAlbumWithAssets(gallery.immichAlbumId);
  return {
    assets: album.assets ?? [],
    gallery,
  };
};
