'use client';

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { useState } from 'react';

import { AdminPageSurface } from '@/components/AdminPageSurface';
import { authClient } from '@/lib/auth-client';

export default function ImpersonateAdminClient() {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );

  const start = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);

    const resolveResponse = await fetch('/api/members/admin/impersonate', {
      body: JSON.stringify({ membershipNumber: membershipNumber.trim() }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const resolvePayload = (await resolveResponse.json()) as {
      error?: string;
      membershipNumber?: string;
      userId?: string;
    };

    if (!resolveResponse.ok || !resolvePayload.userId) {
      setMessageTone('danger');
      setMessage(resolvePayload.error ?? 'Could not start impersonation');
      setBusy(false);
      return;
    }

    const { error } = await authClient.admin.impersonateUser({
      userId: resolvePayload.userId,
    });

    if (error) {
      setMessageTone('danger');
      setMessage(error.message ?? 'Could not start impersonation');
      setBusy(false);
      return;
    }

    // Full load so SiteHeader / nav pick up new session cookie.
    location.replace('/members');
  };

  return (
    <AdminPageSurface
      description='Act as another portal user to troubleshoot. Webmaster only. Session lasts up to 4 hours.'
      maxWidth='xl'
      title='Impersonate member'
    >
      {message
        ? (
            <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )
        : null}

      <Card>
        <Card.Header>
          <Card.Title>Membership number</Card.Title>
          <Card.Description className='text-foreground/85'>
            Target must already have a registered portal account.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form
            className='flex flex-col gap-4'
            onSubmit={(event) => {
              event.preventDefault();
              void start();
            }}
          >
            <TextField
              isRequired
              name='impersonateTarget'
              onChange={setMembershipNumber}
              value={membershipNumber}
            >
              <Label>Membership #</Label>
              <Input
                autoComplete='on'
                inputMode='numeric'
                placeholder='e.g. 0000000'
              />
            </TextField>
            <Button isDisabled={busy} type='submit' variant='primary'>
              {busy ? 'Starting…' : 'Impersonate'}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </AdminPageSurface>
  );
}
