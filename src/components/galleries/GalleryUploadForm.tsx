'use client';

import { Alert, Button, Card, Label } from '@heroui/react';
import { useRef, useState } from 'react';
import type { ImmichUploadSession } from '@/lib/immich/client';
import { uploadFileToImmich } from '@/lib/immich/upload-client';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

type GalleryUploadFormProps = {
  galleryId: string;
  onUploaded?: () => void;
};

export const GalleryUploadForm = ({
  galleryId,
  onUploaded,
}: GalleryUploadFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'danger' | 'accent'>(
    'accent',
  );
  const [uploading, setUploading] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (!file) {
      setStatus('Choose a photo first');
      setStatusTone('danger');
      return;
    }

    if (!allowedMimeTypes.has(file.type)) {
      setStatus('Unsupported file type');
      setStatusTone('danger');
      return;
    }

    setUploading(true);
    setStatus('Preparing upload…');
    setStatusTone('accent');

    const sessionResponse = await fetch(
      `/api/members/galleries/${galleryId}/upload`,
    );

    if (!sessionResponse.ok) {
      const payload = (await sessionResponse.json()) as { error?: string };
      setStatus(payload.error ?? 'Could not start upload');
      setStatusTone('danger');
      setUploading(false);
      return;
    }

    const session = (await sessionResponse.json()) as ImmichUploadSession;

    if (file.size > session.maxBytes) {
      setStatus(
        `File too large (max ${Math.round(session.maxBytes / 1024 / 1024)} MB)`,
      );
      setStatusTone('danger');
      setUploading(false);
      return;
    }

    try {
      setStatus('Uploading to Immich…');
      const upload = await uploadFileToImmich(file, session);

      setStatus('Adding to gallery…');
      const completeResponse = await fetch(
        `/api/members/galleries/${galleryId}/upload/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId: upload.id,
            filename: file.name,
          }),
        },
      );

      const completePayload = (await completeResponse.json()) as {
        error?: string;
      };

      if (!completeResponse.ok) {
        setStatus(
          completePayload.error ??
            'Uploaded to Immich but could not add to gallery',
        );
        setStatusTone('danger');
        setUploading(false);
        return;
      }

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setStatus('Photo uploaded');
      setStatusTone('success');
      setUploading(false);
      onUploaded?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      const corsHint =
        message.includes('Failed to fetch') || message.includes('NetworkError')
          ? ' Check Immich CORS / reverse-proxy settings for this site origin.'
          : '';
      setStatus(`${message}${corsHint}`);
      setStatusTone('danger');
      setUploading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Submit a photo</Card.Title>
        <Card.Description className='text-foreground/85'>
          Files upload directly to your Immich server (not through this app).
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form onSubmit={submit} className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>Image file</Label>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif'
              className='block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-800'
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className='text-sm text-muted-foreground'>{file.name}</p>
            ) : null}
          </div>

          <Button
            type='submit'
            variant='primary'
            isDisabled={uploading}
            fullWidth
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>

          {status ? (
            <Alert
              status={
                statusTone === 'success'
                  ? 'success'
                  : statusTone === 'danger'
                    ? 'danger'
                    : 'accent'
              }
            >
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{status}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </form>
      </Card.Content>
    </Card>
  );
};
