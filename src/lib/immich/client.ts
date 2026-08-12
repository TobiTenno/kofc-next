import { getStoredImmichConfig, trimTrailingSlash } from '@/lib/immich/config';

export type ImmichAlbum = {
  albumName: string;
  albumThumbnailAssetId?: null | string;
  assetCount: number;
  assets?: ImmichAsset[];
  description: string;
  id: string;
};

export type ImmichAsset = {
  id: string;
  localDateTime?: string;
  originalFileName: string;
  type: 'IMAGE' | 'VIDEO';
};

export type ImmichAssetDetail = ImmichAsset & {
  deviceId: string;
  isTrashed?: boolean;
};

export type ImmichConfig = {
  apiBase: string;
  apiKey: string;
};

type ImmichSearchAssetsResponse = {
  assets?: {
    items?: ImmichAsset[];
    nextPage?: null | string;
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
  apiKey: string;
  deviceId: string;
  maxBytes: number;
  uploadUrl: string;
};

export const getImmichDeviceId = (): string =>
  getStoredImmichConfig()?.deviceId?.trim() || 'kofc-council';

/**
Upload-only key for browser direct uploads; falls back to admin key.
*/
export const getImmichUploadApiKey = (): null | string => {
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
    apiKey,
    deviceId: getImmichDeviceId(),
    maxBytes: getMaxUploadBytes(),
    uploadUrl: `${trimTrailingSlash(stored.url)}/api/assets`,
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
    cache: 'no-store',
    headers,
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
  albumName: string;
  albumThumbnailAssetId?: null | string;
  assetCount: number;
  description: string;
  id: string;
};

export const listImmichAlbums = async (): Promise<ImmichAlbumSummary[]> =>
  immichRequest<ImmichAlbumSummary[]>('/albums');

export const createImmichAlbum = async (options: {
  albumName: string;
  description?: string;
}): Promise<ImmichAlbum> =>
  immichRequest<ImmichAlbum>('/albums', {
    body: JSON.stringify({
      albumName: options.albumName,
      description: options.description ?? '',
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

export const getImmichAlbum = async (albumId: string): Promise<ImmichAlbum> =>
  immichRequest<ImmichAlbum>(`/albums/${albumId}`);

/**
Newer Immich omits assets on GET /albums/:id; fetch via metadata search.
*/
export const searchImmichAlbumAssets = async (
  albumId: string,
): Promise<ImmichAsset[]> => {
  const assets: ImmichAsset[] = [];
  let page = 1;

  for (;;) {
    const response = await immichRequest<ImmichSearchAssetsResponse>(
      '/search/metadata',
      {
        body: JSON.stringify({
          albumIds: [albumId],
          page,
          size: 1000,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    );

    const items = response.assets?.items ?? [];
    for (const item of items) {
      assets.push({
        id: item.id,
        localDateTime: item.localDateTime,
        originalFileName: item.originalFileName,
        type: item.type,
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

/**
Ensure a member-uploaded asset belongs to this council user and site upload flow.
*/
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
    body: JSON.stringify({ ids: assetIds }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
};

export type ImmichAssetSize = 'fullsize' | 'preview' | 'thumbnail';

export const fetchImmichAssetMedia = async (
  assetId: string,
  size: ImmichAssetSize,
): Promise<Response> => {
  const config = getImmichConfig();
  if (!config) {
    throw new Error('Immich is not configured');
  }

  const path
    = size === 'fullsize'
      ? `/assets/${assetId}/original`
      : `/assets/${assetId}/thumbnail?size=${size}`;

  const response = await fetch(`${config.apiBase}${path}`, {
    cache: 'no-store',
    headers: { 'x-api-key': config.apiKey },
  });

  if (!response.ok) {
    throw new Error(`Immich asset media failed (${response.status})`);
  }

  return response;
};
