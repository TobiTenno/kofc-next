'use client';

import { Alert, Button, Link as HeroLink } from '@heroui/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import {
  EmailComposeFields,
  type EmailComposeFieldsHandle,
} from '@/components/email/EmailComposeFields';

const EmailForm = () => {
  const searchParams = useSearchParams();
  const targetMember = searchParams.get('member')?.trim() ?? '';
  const composeRef = useRef<EmailComposeFieldsHandle>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { subject, text } = composeRef.current?.getValues() ?? {
      subject: '',
      text: '',
    };

    const response = await fetch('/api/members/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        text,
        ...(targetMember ? { membershipNumber: targetMember } : {}),
      }),
    });

    setLoading(false);
    const payload = (await response.json()) as {
      error?: string;
      recipientCount?: number;
      recipientEmail?: string;
    };

    if (!response.ok) {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Send failed');
      return;
    }

    setMessageTone('success');
    if (payload.recipientEmail) {
      setMessage(`Sent to ${payload.recipientEmail}.`);
    } else {
      setMessage(`Sent to ${payload.recipientCount ?? 0} members.`);
    }
    composeRef.current?.reset();
  };

  return (
    <form onSubmit={submit} className='grid max-w-xl gap-4'>
      {targetMember ? (
        <Alert status='accent'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Single member</Alert.Title>
            <Alert.Description>
              Sending to roster member #{targetMember}.{' '}
              <HeroLink
                href='/members/email'
                className='underline underline-offset-2'
              >
                Email all instead
              </HeroLink>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <p className='text-sm text-muted-foreground'>
          Sends to all active members with an email on file.
        </p>
      )}

      <EmailComposeFields ref={composeRef} messageMinHeightClass='min-h-40' />

      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Button
        type='submit'
        variant='primary'
        isDisabled={loading}
        className='w-fit'
      >
        {loading ? 'Sending…' : targetMember ? 'Send email' : 'Send to council'}
      </Button>
    </form>
  );
};

export default function EmailCouncilPage() {
  return (
    <div className='grid gap-4'>
      <div className='grid gap-2'>
        <h1 className='text-2xl font-bold'>Email Council</h1>
        <p className='text-sm text-muted-foreground'>
          Broadcast to the council here, or expand a member on the{' '}
          <Link href='/members/roster' className='underline underline-offset-2'>
            roster
          </Link>{' '}
          to compose a message to one person.
        </p>
      </div>
      <Suspense>
        <EmailForm />
      </Suspense>
    </div>
  );
}
