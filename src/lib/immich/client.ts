import { getStoredImmichConfig, trimTrailingSlash } from '@/lib/immich/config';

export type ImmichConfig = {
  apiBase: string;
  apiKey: string;
};

export type ImmichAsset = {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  localDateTime?: string;
};

export type ImmichAssetDetail = ImmichAsset & {
  deviceId: string;
  isTrashed?: boolean;
};

export type ImmichAlbum = {
  id: string;
  albumName: string;
  description: string;
  assetCount: number;
  albumThumbnailAssetId?: string | null;
  assets?: ImmichAsset[];
};

type ImmichSearchAssetsResponse = {
  assets?: {
    items?: ImmichAsset[];
    nextPage?: string | null;
  };
};

export const getImmichConfig = (): ImmichConfig | null => {
  const stored = getStoredImmichConfig();
  if (!stored) {
    return null;
  }

  return {
    apiBase: `${trimTrailingSlash(stored.url)}/api`,
    apiKey: stored.apiKey,
  };
};

export const isImmichConfigured = (): boolean => getImmichConfig() !== null;

export type ImmichUploadSession = {
  uploadUrl: string;
  apiKey: string;
  deviceId: string;
  maxBytes: number;
};

export const getImmichDeviceId = (): string =>
  getStoredImmichConfig()?.deviceId?.trim() || 'kofc-council';

/** Upload-only key for browser direct uploads; falls back to admin key. */
export const getImmichUploadApiKey = (): string | null => {
  const stored = getStoredImmichConfig();
  if (!stored) {
    return null;
  }

  return stored.uploadApiKey?.trim() || stored.apiKey;
};

export const getImmichUploadSession = (): ImmichUploadSession | null => {
  const stored = getStoredImmichConfig();
  const apiKey = getImmichUploadApiKey();

  if (!stored?.url || !apiKey) {
    return null;
  }

  return {
    uploadUrl: `${trimTrailingSlash(stored.url)}/api/assets`,
    apiKey,
    deviceId: getImmichDeviceId(),
    maxBytes: getMaxUploadBytes(),
  };
};

export const getMaxUploadBytes = (): number => {
  const megabytes = getStoredImmichConfig()?.maxUploadMb ?? 25;
  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    return 25 * 1024 * 1024;
  }

  return megabytes * 1024 * 1024;
};

const immichRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const config = getImmichConfig();
  if (!config) {
    throw new Error('Immich is not configured');
  }

  const headers = new Headers(init?.headers);
  headers.set('x-api-key', config.apiKey);

  const response = await fetch(`${config.apiBase}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Immich ${path} failed (${response.status}): ${message.slice(0, 200)}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export type ImmichAlbumSummary = {
  id: string;
  albumName: string;
  description: string;
  assetCount: number;
  albumThumbnailAssetId?: string | null;
};

export const listImmichAlbums = async (): Promise<ImmichAlbumSummary[]> =>
  immichRequest<ImmichAlbumSummary[]>('/albums');

export const createImmichAlbum = async (options: {
  albumName: string;
  description?: string;
}): Promise<ImmichAlbum> =>
  immichRequest<ImmichAlbum>('/albums', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      albumName: options.albumName,
      description: options.description ?? '',
    }),
  });

export const getImmichAlbum = async (albumId: string): Promise<ImmichAlbum> =>
  immichRequest<ImmichAlbum>(`/albums/${albumId}`);

/** Newer Immich omits assets on GET /albums/:id; fetch via metadata search. */
export const searchImmichAlbumAssets = async (
  albumId: string,
): Promise<ImmichAsset[]> => {
  const assets: ImmichAsset[] = [];
  let page = 1;

  for (;;) {
    const response = await immichRequest<ImmichSearchAssetsResponse>(
      '/search/metadata',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumIds: [albumId],
          size: 1000,
          page,
        }),
      },
    );

    const items = response.assets?.items ?? [];
    for (const item of items) {
      assets.push({
        id: item.id,
        type: item.type,
        originalFileName: item.originalFileName,
        localDateTime: item.localDateTime,
      });
    }

    if (!response.assets?.nextPage || items.length === 0) {
      break;
    }

    page += 1;
  }

  return assets;
};

export const getImmichAlbumWithAssets = async (
  albumId: string,
): Promise<ImmichAlbum> => {
  const album = await getImmichAlbum(albumId);

  if (album.assets && album.assets.length > 0) {
    return album;
  }

  if ((album.assetCount ?? 0) === 0) {
    return { ...album, assets: [] };
  }

  const assets = await searchImmichAlbumAssets(albumId);
  return { ...album, assets };
};

export const getImmichAsset = async (
  assetId: string,
): Promise<ImmichAssetDetail> =>
  immichRequest<ImmichAssetDetail>(`/assets/${assetId}`);

export class ImmichUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImmichUploadValidationError';
  }
}

/** Ensure a member-uploaded asset belongs to this council user and site upload flow. */
export const assertGalleryUploadAsset = async (
  assetId: string,
): Promise<ImmichAssetDetail> => {
  const asset = await getImmichAsset(assetId);

  if (asset.isTrashed) {
    throw new ImmichUploadValidationError('Asset is not available');
  }

  const expectedDeviceId = getImmichDeviceId();
  if (asset.deviceId !== expectedDeviceId) {
    throw new ImmichUploadValidationError(
      'Asset was not uploaded through this council site',
    );
  }

  return asset;
};

export const addAssetsToImmichAlbum = async (
  albumId: string,
  assetIds: string[],
): Promise<void> => {
  if (assetIds.length === 0) {
    return;
  }

  await immichRequest(`/albums/${albumId}/assets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: assetIds }),
  });
};

export type ImmichAssetSize = 'thumbnail' | 'preview' | 'fullsize';

export const fetchImmichAssetMedia = async (
  assetId: string,
  size: ImmichAssetSize,
): Promise<Response> => {
  const config = getImmichConfig();
  if (!config) {
    throw new Error('Immich is not configured');
  }

  const path =
    size === 'fullsize'
      ? `/assets/${assetId}/original`
      : `/assets/${assetId}/thumbnail?size=${size}`;

  const response = await fetch(`${config.apiBase}${path}`, {
    headers: { 'x-api-key': config.apiKey },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Immich asset media failed (${response.status})`);
  }

  return response;
};
