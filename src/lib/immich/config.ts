import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { appMeta } from '@/db/schema';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import { maskSecret } from '@/lib/utils';

export type ImmichPublicSettings = {
  apiKeyMasked: null | string;
  configured: boolean;
  deviceId: string;
  maxUploadMb: number;
  source: 'env-legacy' | 'none' | 'stored';
  uploadApiKeyMasked: null | string;
  url: string;
};

export type ImmichStoredConfig = {
  apiKey: string;
  deviceId?: string;
  maxUploadMb?: number;
  uploadApiKey?: string;
  url: string;
};

const immichConfigMetaKey = 'immich_config';

let cachedStored: ImmichStoredConfig | null | undefined;

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const normalizeStored = (
  value: ImmichStoredConfig | null | undefined,
): ImmichStoredConfig | null => {
  if (!value?.url?.trim() || !value.apiKey?.trim()) {
    return null;
  }

  return {
    apiKey: value.apiKey.trim(),
    deviceId: value.deviceId?.trim() || undefined,
    maxUploadMb:
      value.maxUploadMb && value.maxUploadMb > 0
        ? value.maxUploadMb
        : undefined,
    uploadApiKey: value.uploadApiKey?.trim() || undefined,
    url: trimTrailingSlash(value.url.trim()),
  };
};

const readImmichFromEnv = (): ImmichStoredConfig | null => {
  const url = process.env.IMMICH_URL?.trim();
  const apiKey = process.env.IMMICH_API_KEY?.trim();
  if (!url || !apiKey) {
    return null;
  }

  return normalizeStored({
    apiKey,
    deviceId: process.env.IMMICH_DEVICE_ID?.trim() || undefined,
    maxUploadMb: Number(process.env.IMMICH_MAX_UPLOAD_MB) || undefined,
    uploadApiKey: process.env.IMMICH_UPLOAD_API_KEY?.trim() || undefined,
    url,
  });
};

const readImmichFromCouncilJson = (): ImmichStoredConfig | null =>
  normalizeStored(loadCouncilConfig().integrations?.immich);

const readImmichFromAppMeta = async (): Promise<ImmichStoredConfig | null> => {
  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, immichConfigMetaKey))
    .limit(1);

  const raw = rows[0]?.value;
  if (!raw) {
    return null;
  }

  try {
    return normalizeStored(JSON.parse(raw) as ImmichStoredConfig);
  }
  catch {
    return null;
  }
};

const writeImmichToAppMeta = async (
  config: ImmichStoredConfig,
): Promise<void> => {
  const value = JSON.stringify(config);
  await db
    .insert(appMeta)
    .values({ key: immichConfigMetaKey, value })
    .onConflictDoUpdate({
      set: { value },
      target: appMeta.key,
    });
};

const writeImmichToCouncilJson = (config: ImmichStoredConfig): void => {
  const current = loadCouncilConfig();
  writeCouncilConfig({
    ...current,
    integrations: {
      ...current.integrations,
      immich: config,
    },
  });
};

/**
Persist Immich settings to council.json and app_meta.
*/
export const writeImmichConfig = async (
  config: ImmichStoredConfig,
): Promise<ImmichStoredConfig> => {
  const normalized = normalizeStored(config);
  if (!normalized) {
    throw new Error('Immich URL and API key are required');
  }

  writeImmichToCouncilJson(normalized);
  await writeImmichToAppMeta(normalized);
  cachedStored = normalized;
  return normalized;
};

/**
 * Migrate env → stores if needed; keep council.json and app_meta aligned.
 * Prefer app_meta, then council.json, then one-time env migrate.
 */
export const ensureImmichConfigSynced = async (): Promise<void> => {
  const fromMeta = await readImmichFromAppMeta();
  const fromJson = readImmichFromCouncilJson();
  const fromEnv = readImmichFromEnv();

  if (fromMeta) {
    if (
      !fromJson
      || fromJson.url !== fromMeta.url
      || fromJson.apiKey !== fromMeta.apiKey
      || fromJson.uploadApiKey !== fromMeta.uploadApiKey
      || fromJson.deviceId !== fromMeta.deviceId
      || fromJson.maxUploadMb !== fromMeta.maxUploadMb
    ) {
      writeImmichToCouncilJson(fromMeta);
    }
    cachedStored = fromMeta;
    return;
  }

  if (fromJson) {
    await writeImmichToAppMeta(fromJson);
    cachedStored = fromJson;
    return;
  }

  if (fromEnv) {
    await writeImmichConfig(fromEnv);
    return;
  }

  cachedStored = null;
};

export const getStoredImmichConfig = (): ImmichStoredConfig | null => {
  if (cachedStored !== undefined) {
    return cachedStored;
  }

  return readImmichFromCouncilJson() ?? readImmichFromEnv();
};

export const toImmichPublicSettings = (
  config: ImmichStoredConfig | null,
  source: ImmichPublicSettings['source'],
): ImmichPublicSettings => ({
  apiKeyMasked: maskSecret(config?.apiKey),
  configured: Boolean(config?.url && config.apiKey),
  deviceId: config?.deviceId?.trim() || 'kofc-council',
  maxUploadMb:
    config?.maxUploadMb && config.maxUploadMb > 0 ? config.maxUploadMb : 25,
  source,
  uploadApiKeyMasked: maskSecret(config?.uploadApiKey),
  url: config?.url ?? '',
});

export const getImmichPublicSettings = (): ImmichPublicSettings => {
  const stored = getStoredImmichConfig();
  if (cachedStored !== undefined) {
    return toImmichPublicSettings(stored, stored ? 'stored' : 'none');
  }

  if (readImmichFromCouncilJson()) {
    return toImmichPublicSettings(stored, 'stored');
  }

  if (readImmichFromEnv()) {
    return toImmichPublicSettings(stored, 'env-legacy');
  }

  return toImmichPublicSettings(null, 'none');
};

export { trimTrailingSlash };
