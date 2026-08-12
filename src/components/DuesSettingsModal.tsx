'use client';

import {
  Alert,
  Button,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  useOverlayState,
} from '@heroui/react';
import { useEffect, useState } from 'react';

import { memberClassCodes, memberClassLabels } from '@/lib/member-class';

type DuesSettings = {
  councilYear: string;
  currency: string;
  paypalBusinessEmail: string;
  paypalClientId?: string;
  paypalClientSecretMasked?: null | string;
  paypalMode?: 'live' | 'sandbox';
  paypalPlans?: Record<string, string>;
  paypalProductId?: string;
  paypalSubSyncIntervalMs?: number;
  paypalWebhookIdMasked?: null | string;
  rates: Record<string, number>;
};

type PaypalMeta = {
  mode: 'live' | 'sandbox';
  restConfigured: boolean;
  subscriptionsReady: boolean;
};

const emptyRates = (): Record<string, string> => {
  const next: Record<string, string> = {};
  for (const code of memberClassCodes) {
    next[code] = '';
  }
  return next;
};

const applySettingsToForm = (
  settings: DuesSettings,
  setters: {
    setCouncilYear: (value: string) => void;
    setCurrency: (value: string) => void;
    setPaypalBusinessEmail: (value: string) => void;
    setPaypalClientId: (value: string) => void;
    setPaypalClientSecretMasked: (value: null | string) => void;
    setPaypalMode: (value: 'live' | 'sandbox') => void;
    setPaypalPlans: (value: Record<string, string>) => void;
    setPaypalSubSyncIntervalMs: (value: string) => void;
    setPaypalWebhookIdMasked: (value: null | string) => void;
    setRateDrafts: (value: Record<string, string>) => void;
  },
): void => {
  setters.setCouncilYear(settings.councilYear);
  setters.setCurrency(settings.currency);
  setters.setPaypalBusinessEmail(settings.paypalBusinessEmail);
  setters.setPaypalClientId(settings.paypalClientId ?? '');
  setters.setPaypalMode(settings.paypalMode ?? 'sandbox');
  setters.setPaypalSubSyncIntervalMs(
    String(settings.paypalSubSyncIntervalMs ?? 3_600_000),
  );
  setters.setPaypalClientSecretMasked(
    settings.paypalClientSecretMasked ?? null,
  );
  setters.setPaypalWebhookIdMasked(settings.paypalWebhookIdMasked ?? null);
  setters.setPaypalPlans(settings.paypalPlans ?? {});
  const next = emptyRates();
  for (const [code, cents] of Object.entries(settings.rates)) {
    next[code] = String(cents);
  }
  setters.setRateDrafts(next);
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
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalClientSecretMasked, setPaypalClientSecretMasked] = useState<
    null | string
  >(null);
  const [paypalMode, setPaypalMode] = useState<'live' | 'sandbox'>('sandbox');
  const [paypalWebhookId, setPaypalWebhookId] = useState('');
  const [paypalWebhookIdMasked, setPaypalWebhookIdMasked] = useState<
    null | string
  >(null);
  const [paypalSubSyncIntervalMs, setPaypalSubSyncIntervalMs]
    = useState('3600000');
  const [rateDrafts, setRateDrafts] = useState(emptyRates);
  const [paypalPlans, setPaypalPlans] = useState<Record<string, string>>({});
  const [paypalMeta, setPaypalMeta] = useState<null | PaypalMeta>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPaypalClientSecret('');
    setPaypalWebhookId('');
    setMessage(null);

    void fetch('/api/members/admin/dues/settings').then(async (response) => {
      const payload = (await response.json()) as {
        error?: string;
        paypal?: PaypalMeta;
        settings?: DuesSettings;
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
      applySettingsToForm(settings, {
        setCouncilYear,
        setCurrency,
        setPaypalBusinessEmail,
        setPaypalClientId,
        setPaypalClientSecretMasked,
        setPaypalMode,
        setPaypalPlans,
        setPaypalSubSyncIntervalMs,
        setPaypalWebhookIdMasked,
        setRateDrafts,
      });
      setPaypalMeta(payload.paypal ?? null);
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
      body: JSON.stringify({
        councilYear,
        currency,
        paypalBusinessEmail,
        paypalClientId,
        paypalClientSecret: paypalClientSecret.trim() || undefined,
        paypalMode,
        paypalSubSyncIntervalMs: Number(paypalSubSyncIntervalMs),
        paypalWebhookId: paypalWebhookId.trim() || undefined,
        rates,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });

    const payload = (await response.json()) as {
      error?: string;
      paypal?: PaypalMeta;
      planSyncError?: null | string;
      settings?: DuesSettings;
    };

    if (response.ok && payload.settings) {
      applySettingsToForm(payload.settings, {
        setCouncilYear,
        setCurrency,
        setPaypalBusinessEmail,
        setPaypalClientId,
        setPaypalClientSecretMasked,
        setPaypalMode,
        setPaypalPlans,
        setPaypalSubSyncIntervalMs,
        setPaypalWebhookIdMasked,
        setRateDrafts,
      });
      setPaypalClientSecret('');
      setPaypalWebhookId('');
      setPaypalMeta(payload.paypal ?? null);
      setMessageTone(payload.planSyncError ? 'danger' : 'success');
      setMessage(
        payload.planSyncError
          ? `Settings saved, but PayPal plan sync failed: ${payload.planSyncError}`
          : 'Dues settings saved',
      );
    }
    else {
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
      error?: string;
      result?: {
        checked: number;
        errors: number;
        paymentsRecorded: number;
        updated: number;
      };
    };
    if (response.ok && payload.result) {
      setMessageTone('success');
      setMessage(
        `Synced ${payload.result.updated}/${payload.result.checked} subscriptions (${payload.result.paymentsRecorded} payments, ${payload.result.errors} errors)`,
      );
    }
    else {
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
                Council year, PayPal config, and class rates (cents). Requires
                manageDues. Saved values apply immediately (no restart).
              </p>

              <Form className='grid gap-4' onSubmit={save}>
                <TextField
                  fullWidth
                  isRequired
                  onChange={setCouncilYear}
                  value={councilYear}
                >
                  <Label>Council year</Label>
                  <Input placeholder='2025-2026' />
                </TextField>

                <TextField fullWidth onChange={setCurrency} value={currency}>
                  <Label>Currency</Label>
                  <Input placeholder='USD' />
                </TextField>

                <TextField
                  fullWidth
                  isRequired
                  onChange={setPaypalBusinessEmail}
                  value={paypalBusinessEmail}
                >
                  <Label>PayPal business email</Label>
                  <Input placeholder='dues@example.com' type='email' />
                  <Description>
                    Used for PayPal Buy Now / IPN. Stored config wins over
                    PAYPAL_BUSINESS_EMAIL env.
                  </Description>
                </TextField>

                <div className='grid gap-3'>
                  <p className='text-sm font-medium'>PayPal REST API</p>

                  <Select
                    onSelectionChange={(key) => {
                      if (key === 'live' || key === 'sandbox') {
                        setPaypalMode(key);
                      }
                    }}
                    selectedKey={paypalMode}
                  >
                    <Label>Mode</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id='sandbox' textValue='Sandbox'>
                          Sandbox
                        </ListBox.Item>
                        <ListBox.Item id='live' textValue='Live'>
                          Live
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <TextField
                    fullWidth
                    onChange={setPaypalClientId}
                    value={paypalClientId}
                  >
                    <Label>Client ID</Label>
                    <Input autoComplete='off' placeholder='PAYPAL_CLIENT_ID' />
                  </TextField>

                  <TextField
                    fullWidth
                    onChange={setPaypalClientSecret}
                    value={paypalClientSecret}
                  >
                    <Label>Client secret</Label>
                    <Input
                      autoComplete='off'
                      placeholder={
                        paypalClientSecretMasked
                          ? `Current ${paypalClientSecretMasked}`
                          : 'PAYPAL_CLIENT_SECRET'
                      }
                      type='password'
                    />
                    <Description>
                      Leave blank to keep the current secret.
                    </Description>
                  </TextField>

                  <TextField
                    fullWidth
                    onChange={setPaypalWebhookId}
                    value={paypalWebhookId}
                  >
                    <Label>Webhook ID</Label>
                    <Input
                      autoComplete='off'
                      placeholder={
                        paypalWebhookIdMasked
                          ? `Current ${paypalWebhookIdMasked}`
                          : 'PAYPAL_WEBHOOK_ID'
                      }
                    />
                    <Description>
                      Leave blank to keep the current webhook ID.
                    </Description>
                  </TextField>

                  <TextField
                    fullWidth
                    onChange={setPaypalSubSyncIntervalMs}
                    value={paypalSubSyncIntervalMs}
                  >
                    <Label>Subscription sync interval (ms)</Label>
                    <Input
                      min={60_000}
                      placeholder='3600000'
                      step={60_000}
                      type='number'
                    />
                    <Description>
                      Minimum 60000 (1 minute). Default 3600000 (hourly).
                    </Description>
                  </TextField>
                </div>

                <div className='grid gap-3'>
                  <p className='text-sm font-medium'>Rates (amount in cents)</p>
                  {memberClassCodes.map(code => (
                    <TextField
                      fullWidth
                      key={code}
                      onChange={value =>
                        setRateDrafts(current => ({
                          ...current,
                          [code]: value,
                        }))}
                      value={rateDrafts[code] ?? ''}
                    >
                      <Label>
                        {memberClassLabels[code]}
                        {' '}
                        (
                        {code}
                        )
                      </Label>
                      <Input
                        min={1}
                        placeholder='4000'
                        step={1}
                        type='number'
                      />
                    </TextField>
                  ))}
                </div>

                {paypalMeta
                  ? (
                      <div className='grid gap-1 rounded border p-3 text-sm'>
                        <p>
                          PayPal REST:
                          {' '}
                          {paypalMeta.restConfigured ? 'configured' : 'missing'}
                          {' '}
                          (
                          {paypalMeta.mode}
                          )
                        </p>
                        <p>
                          Subscriptions:
                          {' '}
                          {paypalMeta.subscriptionsReady ? 'ready' : 'not ready'}
                        </p>
                        {Object.keys(paypalPlans).length > 0
                          ? (
                              <ul className='mt-1 font-mono text-xs'>
                                {Object.entries(paypalPlans).map(([code, planId]) => (
                                  <li key={code}>
                                    {code}
                                    :
                                    {planId}
                                  </li>
                                ))}
                              </ul>
                            )
                          : null}
                      </div>
                    )
                  : null}

                <div className='flex flex-wrap gap-2'>
                  <Button isDisabled={saving} type='submit' variant='primary'>
                    {saving ? 'Saving…' : 'Save dues settings'}
                  </Button>
                  {paypalMeta?.restConfigured
                    ? (
                        <Button
                          isDisabled={syncing}
                          onPress={() => void syncSubscriptions()}
                          type='button'
                          variant='secondary'
                        >
                          {syncing ? 'Syncing…' : 'Sync subscriptions now'}
                        </Button>
                      )
                    : null}
                </div>
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
