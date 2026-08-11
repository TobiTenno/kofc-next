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
import { memberClassCodes, memberClassLabels } from '@/lib/member-class';

type DuesSettings = {
  councilYear: string;
  currency: string;
  paypalBusinessEmail: string;
  rates: Record<string, number>;
};

const emptyRates = (): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const code of memberClassCodes) {
    next[code] = '';
  }
  return next;
};

export default function DuesSettingsPage() {
  const [councilYear, setCouncilYear] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paypalBusinessEmail, setPaypalBusinessEmail] = useState('');
  const [rateDrafts, setRateDrafts] = useState(emptyRates);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  useEffect(() => {
    void fetch('/api/members/admin/dues/settings').then(async (response) => {
      const payload = (await response.json()) as {
        settings?: DuesSettings;
        error?: string;
      };
      if (!response.ok) {
        setMessageTone('danger');
        setMessage(payload.error ?? 'Could not load dues settings');
        return;
      }
      const settings = payload.settings;
      if (!settings) {
        return;
      }
      setCouncilYear(settings.councilYear);
      setCurrency(settings.currency);
      setPaypalBusinessEmail(settings.paypalBusinessEmail);
      const next = emptyRates();
      for (const [code, cents] of Object.entries(settings.rates)) {
        next[code] = String(cents);
      }
      setRateDrafts(next);
    });
  }, []);

  const save = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const rates: Record<string, number> = {};
    for (const [code, value] of Object.entries(rateDrafts)) {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      rates[code] = Number(trimmed);
    }

    const response = await fetch('/api/members/admin/dues/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        councilYear,
        currency,
        paypalBusinessEmail,
        rates,
      }),
    });

    const payload = (await response.json()) as {
      settings?: DuesSettings;
      error?: string;
    };

    if (response.ok && payload.settings) {
      setMessageTone('success');
      setMessage('Dues settings saved');
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  return (
    <div className='grid max-w-2xl gap-6'>
      <div className='grid gap-1'>
        <h1 className='text-2xl font-bold'>Dues Settings</h1>
        <p className='text-sm text-muted-foreground'>
          Council year, PayPal business email, and class rates (cents). Requires{' '}
          <span className='font-medium'>manageDues</span>.
        </p>
        <p className='text-sm'>
          <Link
            href='/members/admin/dues'
            className='underline underline-offset-2'
          >
            Back to Dues Admin
          </Link>
        </p>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Configuration</Card.Title>
          <Card.Description className='text-foreground/85'>
            Portal Dues appears once a year and at least one rate are saved.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={save} className='grid gap-4'>
            <TextField
              fullWidth
              isRequired
              value={councilYear}
              onChange={setCouncilYear}
            >
              <Label>Council year</Label>
              <Input placeholder='2025-2026' />
            </TextField>

            <TextField fullWidth value={currency} onChange={setCurrency}>
              <Label>Currency</Label>
              <Input placeholder='USD' />
            </TextField>

            <TextField
              fullWidth
              isRequired
              value={paypalBusinessEmail}
              onChange={setPaypalBusinessEmail}
            >
              <Label>PayPal business email</Label>
              <Input type='email' placeholder='dues@example.com' />
              <Description>
                Used for PayPal Buy Now / IPN. Can also be set via
                PAYPAL_BUSINESS_EMAIL env (env wins for payments).
              </Description>
            </TextField>

            <div className='grid gap-3'>
              <p className='text-sm font-medium'>Rates (amount in cents)</p>
              {memberClassCodes.map((code) => (
                <TextField
                  key={code}
                  fullWidth
                  value={rateDrafts[code] ?? ''}
                  onChange={(value) =>
                    setRateDrafts((current) => ({
                      ...current,
                      [code]: value,
                    }))
                  }
                >
                  <Label>
                    {memberClassLabels[code]} ({code})
                  </Label>
                  <Input type='number' min={1} step={1} placeholder='4000' />
                </TextField>
              ))}
            </div>

            <Button
              type='submit'
              variant='primary'
              isDisabled={saving}
              fullWidth
            >
              {saving ? 'Saving…' : 'Save dues settings'}
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
