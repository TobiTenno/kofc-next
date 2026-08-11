'use client';

import {
  Alert,
  Button,
  Card,
  Description,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type ImmichSettings = {
  url: string;
  apiKeyMasked: string | null;
  uploadApiKeyMasked: string | null;
  deviceId: string;
  maxUploadMb: number;
  configured: boolean;
  source: 'stored' | 'env-legacy' | 'none';
};

export default function GallerySettingsPage() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [uploadApiKey, setUploadApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('kofc-council');
  const [maxUploadMb, setMaxUploadMb] = useState('25');
  const [settings, setSettings] = useState<ImmichSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  useEffect(() => {
    void fetch('/api/members/admin/galleries/settings').then(
      async (response) => {
        const payload = (await response.json()) as {
          settings?: ImmichSettings;
          error?: string;
        };
        if (!response.ok) {
          setMessageTone('danger');
          setMessage(payload.error ?? 'Could not load Immich settings');
          return;
        }
        const next = payload.settings;
        if (!next) {
          return;
        }
        setSettings(next);
        setUrl(next.url);
        setDeviceId(next.deviceId);
        setMaxUploadMb(String(next.maxUploadMb));
      },
    );
  }, []);

  const save = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch('/api/members/admin/galleries/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        apiKey: apiKey.trim() || undefined,
        uploadApiKey: uploadApiKey.trim() || undefined,
        deviceId,
        maxUploadMb: Number(maxUploadMb),
      }),
    });

    const payload = (await response.json()) as {
      settings?: ImmichSettings;
      error?: string;
    };

    if (response.ok && payload.settings) {
      setSettings(payload.settings);
      setApiKey('');
      setUploadApiKey('');
      setMessageTone('success');
      setMessage('Immich settings saved');
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  return (
    <div className='grid max-w-2xl gap-6'>
      <div className='grid gap-1'>
        <h1 className='text-2xl font-bold'>Gallery Settings</h1>
        <p className='text-sm text-muted-foreground'>
          Immich connection for council photo galleries. Requires{' '}
          <span className='font-medium'>manageGalleries</span>.
        </p>
        <p className='text-sm'>
          <Link
            href='/members/admin/galleries'
            className='underline underline-offset-2'
          >
            Back to galleries
          </Link>
        </p>
      </div>

      {settings ? (
        <Alert status={settings.configured ? 'success' : 'warning'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {settings.configured
                ? `Immich configured (${settings.source === 'env-legacy' ? 'migrated from env' : 'stored'}).`
                : 'Immich is not configured yet.'}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Card>
        <Card.Header>
          <Card.Title>Immich</Card.Title>
          <Card.Description className='text-foreground/85'>
            Leave API key fields blank to keep the current secret.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={save} className='grid gap-4'>
            <TextField fullWidth isRequired value={url} onChange={setUrl}>
              <Label>Immich URL</Label>
              <Input placeholder='https://photos.example.com' />
            </TextField>

            <TextField fullWidth value={apiKey} onChange={setApiKey}>
              <Label>API key</Label>
              <Input
                type='password'
                autoComplete='off'
                placeholder={
                  settings?.apiKeyMasked
                    ? `Current ${settings.apiKeyMasked}`
                    : 'Server API key'
                }
              />
              <Description>
                Server key for album/asset read and write.
              </Description>
            </TextField>

            <TextField
              fullWidth
              value={uploadApiKey}
              onChange={setUploadApiKey}
            >
              <Label>Upload API key (optional)</Label>
              <Input
                type='password'
                autoComplete='off'
                placeholder={
                  settings?.uploadApiKeyMasked
                    ? `Current ${settings.uploadApiKeyMasked}`
                    : 'Defaults to API key'
                }
              />
            </TextField>

            <TextField fullWidth value={deviceId} onChange={setDeviceId}>
              <Label>Device ID</Label>
              <Input placeholder='kofc-council' />
            </TextField>

            <TextField fullWidth value={maxUploadMb} onChange={setMaxUploadMb}>
              <Label>Max upload (MB)</Label>
              <Input type='number' min={1} step={1} />
            </TextField>

            <Button
              type='submit'
              variant='primary'
              isDisabled={saving}
              fullWidth
            >
              {saving ? 'Saving…' : 'Save Immich settings'}
            </Button>
          </Form>
        </Card.Content>
      </Card>

      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}
