'use client';

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { AdminPageSurface } from '@/components/AdminPageSurface';
import { DuesSettingsModal } from '@/components/DuesSettingsModal';

type MemberResult = {
  member: {
    membershipNumber: string;
    firstName: string;
    lastName: string;
    memberClass: string | null;
  };
  status: { paid: boolean };
  dues: { amountCents: number; councilYear: string } | null;
  subscription: {
    status: string;
    nextBillingAt: string | Date | null;
    paypalSubscriptionId: string;
  } | null;
};

type PaymentMethod = 'cash' | 'check' | 'paypal' | 'other';

export default function DuesAdminPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberResult[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    void fetch('/api/members/admin/dues').then(async (response) => {
      const payload = (await response.json()) as {
        canManageSettings?: boolean;
      };
      if (response.ok) {
        setCanManageSettings(Boolean(payload.canManageSettings));
      }
    });
  }, []);

  const search = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSearching(true);
    setMessage(null);
    const response = await fetch(
      `/api/members/admin/dues?q=${encodeURIComponent(query)}`,
    );
    const payload = (await response.json()) as {
      members?: MemberResult[];
      canManageSettings?: boolean;
      error?: string;
    };
    if (!response.ok) {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Search failed');
      setSearching(false);
      return;
    }
    setResults(payload.members ?? []);
    if (typeof payload.canManageSettings === 'boolean') {
      setCanManageSettings(payload.canManageSettings);
    }
    setSearching(false);
  };

  const markPaid = async (membershipNumber: string): Promise<void> => {
    const response = await fetch('/api/members/admin/dues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber, method, notes }),
    });

    const payload = (await response.json()) as { error?: string };
    setMessageTone(response.ok ? 'success' : 'danger');
    setMessage(response.ok ? 'Marked paid' : (payload.error ?? 'Failed'));
    if (response.ok) {
      await search(new Event('submit') as unknown as React.FormEvent);
    }
  };

  const formatNextBilling = (
    value: string | Date | null | undefined,
  ): string => {
    if (!value) {
      return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString();
  };

  return (
    <AdminPageSurface
      title='Dues Admin'
      description='Mark members paid (manageDues or Financial Secretary).'
      manageAriaLabel='Manage dues settings'
      maxWidth='3xl'
      onManage={canManageSettings ? () => setSettingsOpen(true) : undefined}
    >
      <Card>
        <Card.Header>
          <Card.Title>Find member</Card.Title>
          <Card.Description className='text-foreground/85'>
            Search by membership number or name, then mark dues paid.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={search} className='grid gap-4'>
            <TextField fullWidth value={query} onChange={setQuery}>
              <Label>Membership number or name</Label>
              <Input placeholder='e.g. 1234567 or Smith' />
            </TextField>

            <Select
              fullWidth
              selectedKey={method}
              onSelectionChange={(key) => {
                if (key == null) {
                  return;
                }
                setMethod(String(key) as PaymentMethod);
              }}
            >
              <Label>Payment method</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id='cash' textValue='Cash'>
                    Cash
                  </ListBox.Item>
                  <ListBox.Item id='check' textValue='Check'>
                    Check
                  </ListBox.Item>
                  <ListBox.Item id='paypal' textValue='PayPal'>
                    PayPal
                  </ListBox.Item>
                  <ListBox.Item id='other' textValue='Other'>
                    Other
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField fullWidth value={notes} onChange={setNotes}>
              <Label>Notes</Label>
              <Input placeholder='Optional' />
            </TextField>

            <Button
              type='submit'
              variant='primary'
              isDisabled={searching}
              fullWidth
            >
              {searching ? 'Searching…' : 'Search'}
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

      <ul className='grid gap-3'>
        {results.map((result) => (
          <Card key={result.member.membershipNumber}>
            <Card.Content className='grid gap-2 pt-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='grid gap-1'>
                  <p className='font-medium'>
                    {result.member.firstName} {result.member.lastName} (
                    {result.member.membershipNumber})
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {result.status.paid
                      ? 'Paid'
                      : `Unpaid — $${((result.dues?.amountCents ?? 0) / 100).toFixed(2)}`}
                  </p>
                  {result.subscription ? (
                    <p className='text-sm text-muted-foreground'>
                      Sub: {result.subscription.status}
                      {result.subscription.status === 'active'
                        ? ` · next ${formatNextBilling(result.subscription.nextBillingAt)}`
                        : ''}
                      <span className='ml-1 font-mono text-xs'>
                        ({result.subscription.paypalSubscriptionId})
                      </span>
                    </p>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No subscription
                    </p>
                  )}
                </div>
                {!result.status.paid ? (
                  <Button
                    type='button'
                    variant='primary'
                    onPress={() =>
                      void markPaid(result.member.membershipNumber)
                    }
                  >
                    Mark as paid
                  </Button>
                ) : null}
              </div>
            </Card.Content>
          </Card>
        ))}
      </ul>

      {canManageSettings ? (
        <DuesSettingsModal
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      ) : null}
    </AdminPageSurface>
  );
}
