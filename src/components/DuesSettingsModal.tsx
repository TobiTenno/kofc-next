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
import { memberClassCodes, memberClassLabels } from '@/lib/member-class';

type DuesSettings = {
  councilYear: string;
  currency: string;
  paypalBusinessEmail: string;
  rates: Record<string, number>;
  paypalProductId?: string;
  paypalPlans?: Record<string, string>;
};

type PaypalMeta = {
  restConfigured: boolean;
  subscriptionsReady: boolean;
  mode: 'sandbox' | 'live';
};

const emptyRates = (): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const code of memberClassCodes) {
    next[code] = '';
  }
  return next;
};

export const DuesSettingsModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const overlay = useOverlayState({ isOpen, onOpenChange });
  const [councilYear, setCouncilYear] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paypalBusinessEmail, setPaypalBusinessEmail] = useState('');
  const [rateDrafts, setRateDrafts] = useState(emptyRates);
  const [paypalPlans, setPaypalPlans] = useState<Record<string, string>>({});
  const [paypalMeta, setPaypalMeta] = useState<PaypalMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetch('/api/members/admin/dues/settings').then(async (response) => {
      const payload = (await response.json()) as {
        settings?: DuesSettings;
        paypal?: PaypalMeta;
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
      setPaypalPlans(settings.paypalPlans ?? {});
      setPaypalMeta(payload.paypal ?? null);
      const next = emptyRates();
      for (const [code, cents] of Object.entries(settings.rates)) {
        next[code] = String(cents);
      }
      setRateDrafts(next);
    });
  }, [isOpen]);

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
      paypal?: PaypalMeta;
      planSyncError?: string | null;
      error?: string;
    };

    if (response.ok && payload.settings) {
      setPaypalPlans(payload.settings.paypalPlans ?? {});
      setPaypalMeta(payload.paypal ?? null);
      setMessageTone(payload.planSyncError ? 'danger' : 'success');
      setMessage(
        payload.planSyncError
          ? `Settings saved, but PayPal plan sync failed: ${payload.planSyncError}`
          : 'Dues settings saved',
      );
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  const syncSubscriptions = async (): Promise<void> => {
    setSyncing(true);
    setMessage(null);
    const response = await fetch('/api/cron/paypal/subscriptions', {
      method: 'POST',
    });
    const payload = (await response.json()) as {
      result?: {
        checked: number;
        updated: number;
        paymentsRecorded: number;
        errors: number;
      };
      error?: string;
    };
    if (response.ok && payload.result) {
      setMessageTone('success');
      setMessage(
        `Synced ${payload.result.updated}/${payload.result.checked} subscriptions (${payload.result.paymentsRecorded} payments, ${payload.result.errors} errors)`,
      );
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Sync failed');
    }
    setSyncing(false);
  };

  return (
    <Modal state={overlay}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container placement='center' size='lg'>
          <Modal.Dialog aria-label='Dues settings'>
            <Modal.Header>
              <Modal.Heading>Dues Settings</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className='grid gap-4'>
              <p className='text-sm text-muted-foreground'>
                Council year, PayPal business email, and class rates (cents).
                Requires manageDues.
              </p>

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
                      <Input
                        type='number'
                        min={1}
                        step={1}
                        placeholder='4000'
                      />
                    </TextField>
                  ))}
                </div>

                {paypalMeta ? (
                  <div className='grid gap-1 rounded border p-3 text-sm'>
                    <p>
                      PayPal REST:{' '}
                      {paypalMeta.restConfigured ? 'configured' : 'missing'} (
                      {paypalMeta.mode})
                    </p>
                    <p>
                      Subscriptions:{' '}
                      {paypalMeta.subscriptionsReady ? 'ready' : 'not ready'}
                    </p>
                    {Object.keys(paypalPlans).length > 0 ? (
                      <ul className='mt-1 font-mono text-xs'>
                        {Object.entries(paypalPlans).map(([code, planId]) => (
                          <li key={code}>
                            {code}: {planId}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className='flex flex-wrap gap-2'>
                  <Button type='submit' variant='primary' isDisabled={saving}>
                    {saving ? 'Saving…' : 'Save dues settings'}
                  </Button>
                  {paypalMeta?.restConfigured ? (
                    <Button
                      type='button'
                      variant='secondary'
                      isDisabled={syncing}
                      onPress={() => void syncSubscriptions()}
                    >
                      {syncing ? 'Syncing…' : 'Sync subscriptions now'}
                    </Button>
                  ) : null}
                </div>
              </Form>

              {message ? (
                <Alert
                  status={messageTone === 'success' ? 'success' : 'danger'}
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{message}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
