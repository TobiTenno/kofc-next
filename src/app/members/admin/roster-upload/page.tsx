'use client';

import { Alert, Button, Card, Form, Label } from '@heroui/react';
import { useRef, useState } from 'react';
import { AdminPageSurface } from '@/components/AdminPageSurface';

export default function RosterAdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  const upload = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!file) {
      setMessageTone('danger');
      setMessage('Choose a CSV file first');
      return;
    }

    setUploading(true);
    setMessage(null);

    const body = new FormData();
    body.set('file', file);

    const response = await fetch('/api/members/admin/roster/upload', {
      method: 'POST',
      body,
    });
    const payload = (await response.json()) as {
      error?: string;
      upserted?: number;
      deactivated?: number;
      rowCount?: number;
    };

    if (response.ok) {
      setMessageTone('success');
      setMessage(
        `Uploaded ${payload.rowCount ?? 0} rows. ${payload.upserted ?? 0} active, ${payload.deactivated ?? 0} deactivated.`,
      );
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Upload failed');
    }

    setUploading(false);
  };

  const syncFromDisk = async (): Promise<void> => {
    setSyncing(true);
    setMessage(null);

    const response = await fetch('/api/members/admin/sync-csv', {
      method: 'POST',
    });
    const payload = (await response.json()) as {
      error?: string;
      upserted?: number;
      deactivated?: number;
    };

    if (response.ok) {
      setMessageTone('success');
      setMessage(
        `Synced from disk. ${payload.upserted ?? 0} active, ${payload.deactivated ?? 0} deactivated.`,
      );
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Sync failed');
    }

    setSyncing(false);
  };

  return (
    <AdminPageSurface title='Roster Admin'>
      <Card>
        <Card.Header>
          <Card.Title>Upload roster CSV</Card.Title>
          <Card.Description className='text-foreground/85'>
            Replace the council roster file, then sync members into the
            database.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={upload} className='grid gap-4'>
            <div className='grid gap-2'>
              <Label>CSV file</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='.csv,text/csv'
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
              {uploading ? 'Uploading…' : 'Upload and sync'}
            </Button>
          </Form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Sync from disk</Card.Title>
          <Card.Description className='text-foreground/85'>
            Re-read the roster CSV already on the server without uploading a new
            file.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Button
            variant='secondary'
            isDisabled={syncing}
            fullWidth
            onPress={() => void syncFromDisk()}
          >
            {syncing ? 'Syncing…' : 'Sync current CSV'}
          </Button>
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
    </AdminPageSurface>
  );
}
