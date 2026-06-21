import type { ImmichUploadSession } from '@/lib/immich/client';

export type ImmichUploadResult = {
  id: string;
  status: string;
};

export const uploadFileToImmich = async (
  file: File,
  session: ImmichUploadSession,
): Promise<ImmichUploadResult> => {
  const now = new Date().toISOString();
  const form = new FormData();
  form.append('assetData', file, file.name);
  form.append('fileCreatedAt', now);
  form.append('fileModifiedAt', now);
  form.append('filename', file.name);
  form.append('deviceAssetId', crypto.randomUUID());
  form.append('deviceId', session.deviceId);

  const response = await fetch(session.uploadUrl, {
    method: 'POST',
    headers: { 'x-api-key': session.apiKey },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message.slice(0, 200) || `Immich upload failed (${response.status})`,
    );
  }

  return response.json() as Promise<ImmichUploadResult>;
};
