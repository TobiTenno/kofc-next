'use client';

import {
  Alert,
  Button,
  Description,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  useOverlayState,
} from '@heroui/react';
import { useEffect, useState } from 'react';

type ImmichSettings = {
  apiKeyMasked: null | string;
  configured: boolean;
  deviceId: string;
  maxUploadMb: number;
  source: 'env-legacy' | 'none' | 'stored';
  uploadApiKeyMasked: null | string;
  url: string;
};

export const GallerySettingsModal = ({
  isOpen,
  onOpenChange,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: ImmichSettings) => void;
}) => {
  const overlay = useOverlayState({ isOpen, onOpenChange });
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [uploadApiKey, setUploadApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('kofc-council');
  const [maxUploadMb, setMaxUploadMb] = useState('25');
  const [settings, setSettings] = useState<ImmichSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetch('/api/members/admin/galleries/settings').then(
      async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          settings?: ImmichSettings;
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
  }, [isOpen]);

  const save = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch('/api/members/admin/galleries/settings', {
      body: JSON.stringify({
        apiKey: apiKey.trim() || undefined,
        deviceId,
        maxUploadMb: Number(maxUploadMb),
        uploadApiKey: uploadApiKey.trim() || undefined,
        url,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });

    const payload = (await response.json()) as {
      error?: string;
      settings?: ImmichSettings;
    };

    if (response.ok && payload.settings) {
      setSettings(payload.settings);
      setApiKey('');
      setUploadApiKey('');
      setMessageTone('success');
      setMessage('Immich settings saved');
      onSaved?.(payload.settings);
    }
    else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  return (
    <Modal state={overlay}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container placement='center' size='lg'>
          <Modal.Dialog aria-label='Gallery settings'>
            <Modal.Header>
              <Modal.Heading>Gallery Settings</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className='grid gap-4'>
              <p className='text-sm text-muted-foreground'>
                Immich connection for council photo galleries. Requires
                manageGalleries.
              </p>

              {settings
                ? (
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
                  )
                : null}

              <Form className='grid gap-4' onSubmit={save}>
                <TextField fullWidth isRequired onChange={setUrl} value={url}>
                  <Label>Immich URL</Label>
                  <Input placeholder='https://photos.example.com' />
                </TextField>

                <TextField fullWidth onChange={setApiKey} value={apiKey}>
                  <Label>API key</Label>
                  <Input
                    autoComplete='off'
                    placeholder={
                      settings?.apiKeyMasked
                        ? `Current ${settings.apiKeyMasked}`
                        : 'Server API key'
                    }
                    type='password'
                  />
                  <Description>
                    Server key for album/asset read and write. Leave blank to
                    keep the current secret.
                  </Description>
                </TextField>

                <TextField
                  fullWidth
                  onChange={setUploadApiKey}
                  value={uploadApiKey}
                >
                  <Label>Upload API key (optional)</Label>
                  <Input
                    autoComplete='off'
                    placeholder={
                      settings?.uploadApiKeyMasked
                        ? `Current ${settings.uploadApiKeyMasked}`
                        : 'Defaults to API key'
                    }
                    type='password'
                  />
                </TextField>

                <TextField fullWidth onChange={setDeviceId} value={deviceId}>
                  <Label>Device ID</Label>
                  <Input placeholder='kofc-council' />
                </TextField>

                <TextField
                  fullWidth
                  onChange={setMaxUploadMb}
                  value={maxUploadMb}
                >
                  <Label>Max upload (MB)</Label>
                  <Input min={1} step={1} type='number' />
                </TextField>

                <Button isDisabled={saving} type='submit' variant='primary'>
                  {saving ? 'Saving…' : 'Save Immich settings'}
                </Button>
              </Form>

              {message
                ? (
                    <Alert
                      status={messageTone === 'success' ? 'success' : 'danger'}
                    >
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{message}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )
                : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
