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
import { useEffect, useState } from 'react';

import { AdminPageSurface } from '@/components/AdminPageSurface';
import {
  emptyPermissionDrafts,
  formatMembershipNumbers,
  parseMembershipNumbers,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from '@/lib/utilities';

export default function PermissionsAdminPage() {
  const [drafts, setDrafts] = useState(emptyPermissionDrafts);
  const [savingKey, setSavingKey] = useState<null | PermissionKey>(null);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );

  useEffect(() => {
    void fetch('/api/members/admin/permissions')
      .then(response => response.json())
      .then((payload) => {
        if (!payload.permissions) {
          return;
        }

        const next = emptyPermissionDrafts();
        for (const key of PERMISSION_KEYS) {
          next[key] = formatMembershipNumbers(payload.permissions[key] ?? []);
        }
        setDrafts(next);
      });
  }, []);

  const save = async (key: PermissionKey): Promise<void> => {
    setSavingKey(key);
    setMessage(null);

    const membershipNumbers = parseMembershipNumbers(drafts[key]);
    const response = await fetch('/api/members/admin/permissions', {
      body: JSON.stringify({
        key,
        membershipNumbers,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        membershipNumbers?: string[];
      };
      setDrafts(current => ({
        ...current,
        [key]: formatMembershipNumbers(
          payload.membershipNumbers ?? membershipNumbers,
        ),
      }));
      setMessageTone('success');
      setMessage(`Saved ${PERMISSION_LABELS[key]}`);
    }
    else {
      setMessageTone('danger');
      setMessage(`Could not save ${PERMISSION_LABELS[key]}`);
    }

    setSavingKey(null);
  };

  return (
    <AdminPageSurface
      description='Webmaster always has every permission. Holders of Manage permissions can edit every list below and use every permission-gated admin tool (including new keys).'
      maxWidth='5xl'
      title='Permissions'
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        {PERMISSION_KEYS.map(key => (
          <Card key={key}>
            <Card.Header>
              <Card.Title>{PERMISSION_LABELS[key]}</Card.Title>
              <Card.Description className='text-foreground/85'>
                Grant access by membership number. Separate multiple numbers
                with commas.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <Form
                className='grid gap-4'
                onSubmit={(event) => {
                  event.preventDefault();
                  void save(key);
                }}
              >
                <TextField
                  fullWidth
                  name={key}
                  onChange={value =>
                    setDrafts(current => ({
                      ...current,
                      [key]: value,
                    }))}
                  value={drafts[key]}
                >
                  <Label>Membership numbers</Label>
                  <Input placeholder='123456, 234567' />
                  <Description>
                    Comma-separated council membership numbers with this
                    permission.
                  </Description>
                </TextField>
                <Button
                  fullWidth
                  isDisabled={savingKey === key}
                  type='submit'
                  variant='primary'
                >
                  {savingKey === key ? 'Saving…' : 'Save'}
                </Button>
              </Form>
            </Card.Content>
          </Card>
        ))}
      </div>

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
    </AdminPageSurface>
  );
}
