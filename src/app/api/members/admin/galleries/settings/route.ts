import { NextResponse } from 'next/server';

import { recordAuditEvent } from '@/lib/audit';
import {
  ensureImmichConfigSynced,
  getImmichPublicSettings,
  getStoredImmichConfig,
  writeImmichConfig,
} from '@/lib/immich/config';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageGalleries'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureImmichConfigSynced();
  return NextResponse.json({ settings: getImmichPublicSettings() });
};

export const PUT = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageGalleries'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureImmichConfigSynced();
  const existing = getStoredImmichConfig();

  const body = (await request.json()) as {
    apiKey?: string;
    deviceId?: string;
    maxUploadMb?: number;
    uploadApiKey?: string;
    url?: string;
  };

  const url = body.url?.trim() ?? existing?.url ?? '';
  const apiKey = body.apiKey?.trim() || existing?.apiKey || '';
  if (!url || !apiKey) {
    return NextResponse.json(
      { error: 'Immich URL and API key are required' },
      { status: 400 },
    );
  }

  const uploadProvided = body.uploadApiKey !== undefined;
  const uploadApiKey = uploadProvided
    ? body.uploadApiKey?.trim() || undefined
    : existing?.uploadApiKey;

  try {
    await writeImmichConfig({
      apiKey,
      deviceId: body.deviceId?.trim() || existing?.deviceId || 'kofc-council',
      maxUploadMb:
        body.maxUploadMb && body.maxUploadMb > 0
          ? body.maxUploadMb
          : (existing?.maxUploadMb ?? 25),
      uploadApiKey,
      url,
    });
  }
  catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save Immich settings',
      },
      { status: 400 },
    );
  }

  await recordAuditEvent({
    action: 'galleries.settings.update',
    actorMembershipNumber: membershipNumber,
    metadata: { url },
    summary: 'Updated Immich gallery settings',
  });

  return NextResponse.json({ settings: getImmichPublicSettings() });
};
