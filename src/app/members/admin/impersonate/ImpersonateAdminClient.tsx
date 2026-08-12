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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminPageSurface } from '@/components/AdminPageSurface';
import { authClient } from '@/lib/auth-client';

export default function ImpersonateAdminClient() {
  const router = useRouter();
  const [membershipNumber, setMembershipNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  const start = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);

    const resolveResponse = await fetch('/api/members/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber: membershipNumber.trim() }),
    });

    const resolvePayload = (await resolveResponse.json()) as {
      error?: string;
      userId?: string;
      membershipNumber?: string;
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

    setMessageTone('success');
    setMessage(
      `Now viewing as #${resolvePayload.membershipNumber ?? membershipNumber}`,
    );
    router.refresh();
    router.push('/members');
  };

  return (
    <AdminPageSurface
      title='Impersonate member'
      description='Act as another portal user to troubleshoot. Webmaster only. Session lasts up to 4 hours.'
      maxWidth='xl'
    >
      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

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
              name='impersonateTarget'
              isRequired
              value={membershipNumber}
              onChange={setMembershipNumber}
            >
              <Label>Membership #</Label>
              <Input
                inputMode='numeric'
                autoComplete='on'
                placeholder='e.g. 0000000'
              />
            </TextField>
            <Button type='submit' variant='primary' isDisabled={busy}>
              {busy ? 'Starting…' : 'Impersonate'}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </AdminPageSurface>
  );
}
