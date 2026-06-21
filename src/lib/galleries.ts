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
  title: string;
  description?: string;
  allowMemberUploads: boolean;
  createdBy: string;
  immichAlbumId?: string;
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
    id: createId(),
    title: options.title,
    description: options.description ?? null,
    immichAlbumId: immichAlbum.id,
    allowMemberUploads: options.allowMemberUploads,
    active: true,
    createdBy: options.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(photoGalleries).values(record);
  return record;
};

export const updateGallery = async (
  id: string,
  patch: Partial<
    Pick<
      GalleryRecord,
      'title' | 'description' | 'allowMemberUploads' | 'active'
    >
  >,
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

  return {
    ...existing,
    ...patch,
    updatedAt: now,
  };
};

export const completeGalleryUpload = async (options: {
  gallery: GalleryRecord;
  membershipNumber: string;
  assetId: string;
  filename: string;
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
    id: createId(),
    galleryId: options.gallery.id,
    immichAssetId: options.assetId,
    membershipNumber: options.membershipNumber,
    filename: options.filename,
    createdAt: new Date(),
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
    gallery,
    assets: album.assets ?? [],
  };
};
