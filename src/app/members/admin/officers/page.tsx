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
import { ALL_OFFICER_POSITIONS, Position } from '@/schema/council';

type OfficerDraft = {
  email: string;
  id: string;
  membershipNumber: string;
  name: string;
  phone: string;
  position: Position;
  termEnd: string;
};

const createDraftId = (): string =>
  `officer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyOfficer = (): OfficerDraft => ({
  email: '',
  id: createDraftId(),
  membershipNumber: '',
  name: '',
  phone: '',
  position: Position.GrandKnight,
  termEnd: '',
});

const toDraft = (officer: {
  email?: string;
  membershipNumber?: string;
  name: string;
  phone?: string;
  position: Position;
  termEnd?: string;
}): OfficerDraft => ({
  email: officer.email ?? '',
  id: createDraftId(),
  membershipNumber: officer.membershipNumber ?? '',
  name: officer.name,
  phone: officer.phone ?? '',
  position: officer.position,
  termEnd: officer.termEnd ?? '',
});

export default function OfficersAdminPage() {
  const [officers, setOfficers] = useState<OfficerDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpIndex, setLookingUpIndex] = useState<null | number>(null);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/members/admin/officers', { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          officers?: Array<{
            email?: string;
            membershipNumber?: string;
            name: string;
            phone?: string;
            position: Position;
            termEnd?: string;
          }>;
        };
        if (!response.ok) {
          setMessageTone('danger');
          setMessage(payload.error ?? 'Could not load officers');
          return;
        }
        setOfficers((payload.officers ?? []).map(toDraft));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const updateOfficer = (index: number, patch: Partial<OfficerDraft>): void => {
    setOfficers(current =>
      current.map((officer, i) =>
        i === index ? { ...officer, ...patch } : officer,
      ),
    );
  };

  const addOfficer = (): void => {
    const used = new Set(officers.map(officer => officer.position));
    const nextPosition
      = ALL_OFFICER_POSITIONS.find(position => !used.has(position))
        ?? Position.GrandKnight;
    setOfficers(current => [
      ...current,
      { ...emptyOfficer(), position: nextPosition },
    ]);
  };

  const removeOfficer = (index: number): void => {
    setOfficers(current => current.filter((_, i) => i !== index));
  };

  const lookupMember = async (index: number): Promise<void> => {
    const membershipNumber = officers[index]?.membershipNumber.trim();
    if (!membershipNumber) {
      setMessageTone('danger');
      setMessage('Enter a membership number to look up');
      return;
    }

    setLookingUpIndex(index);
    setMessage(null);
    const response = await fetch('/api/members/admin/officers', {
      body: JSON.stringify({ membershipNumber }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const payload = (await response.json()) as {
      error?: string;
      member?: {
        email: null | string;
        membershipNumber: string;
        name: string;
        phone: null | string;
      };
    };

    if (!response.ok || !payload.member) {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Member lookup failed');
      setLookingUpIndex(null);
      return;
    }

    updateOfficer(index, {
      email: payload.member.email ?? '',
      membershipNumber: payload.member.membershipNumber,
      name: payload.member.name,
      phone: payload.member.phone ?? '',
    });
    setMessageTone('success');
    setMessage(`Filled from roster member ${payload.member.membershipNumber}`);
    setLookingUpIndex(null);
  };

  const save = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch('/api/members/admin/officers', {
      body: JSON.stringify({
        officers: officers.map(officer => ({
          email: officer.email || undefined,
          membershipNumber: officer.membershipNumber || undefined,
          name: officer.name,
          phone: officer.phone || undefined,
          position: officer.position,
          termEnd: officer.termEnd || undefined,
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });

    const payload = (await response.json()) as {
      error?: string;
      officers?: Array<{
        email?: string;
        membershipNumber?: string;
        name: string;
        phone?: string;
        position: Position;
        termEnd?: string;
      }>;
    };

    if (response.ok && payload.officers) {
      setOfficers(payload.officers.map(toDraft));
      setMessageTone('success');
      setMessage('Officers saved');
    }
    else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  return (
    <AdminPageSurface
      description='Edit council officers stored in council.json. Set membership number (and look up from roster) so roster access and Financial Secretary tools resolve correctly.'
      maxWidth='3xl'
      title='Officers Admin'
    >
      {loading
        ? (
            <p className='text-sm text-muted-foreground'>Loading…</p>
          )
        : (
            <Form className='grid gap-6' onSubmit={save}>
              {officers.map((officer, index) => (
                <Card key={officer.id}>
                  <Card.Header>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <Card.Title>{officer.position || 'Officer'}</Card.Title>
                      <Button
                        onPress={() => removeOfficer(index)}
                        size='sm'
                        type='button'
                        variant='danger'
                      >
                        Remove
                      </Button>
                    </div>
                    <Card.Description className='text-foreground/85'>
                      Prefer membership number + Look up so email matches the
                      roster.
                    </Card.Description>
                  </Card.Header>
                  <Card.Content className='grid gap-4'>
                    <Select
                      fullWidth
                      onSelectionChange={(key) => {
                        if (key == null) {
                          return;
                        }
                        updateOfficer(index, {
                          position: String(key) as Position,
                        });
                      }}
                      selectedKey={officer.position}
                    >
                      <Label>Position</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ALL_OFFICER_POSITIONS.map(position => (
                            <ListBox.Item
                              id={position}
                              key={position}
                              textValue={position}
                            >
                              {position}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
                      <TextField
                        fullWidth
                        onChange={value =>
                          updateOfficer(index, { membershipNumber: value })}
                        value={officer.membershipNumber}
                      >
                        <Label>Membership number</Label>
                        <Input placeholder='e.g. 0000000' />
                      </TextField>
                      <Button
                        isDisabled={lookingUpIndex === index}
                        onPress={() => void lookupMember(index)}
                        type='button'
                        variant='secondary'
                      >
                        {lookingUpIndex === index ? 'Looking up…' : 'Look up'}
                      </Button>
                    </div>

                    <TextField
                      fullWidth
                      isRequired
                      onChange={value => updateOfficer(index, { name: value })}
                      value={officer.name}
                    >
                      <Label>Name</Label>
                      <Input />
                    </TextField>

                    <TextField
                      fullWidth
                      onChange={value => updateOfficer(index, { email: value })}
                      value={officer.email}
                    >
                      <Label>Email</Label>
                      <Input type='email' />
                    </TextField>

                    <TextField
                      fullWidth
                      onChange={value => updateOfficer(index, { phone: value })}
                      value={officer.phone}
                    >
                      <Label>Phone</Label>
                      <Input />
                    </TextField>

                    <TextField
                      fullWidth
                      onChange={value => updateOfficer(index, { termEnd: value })}
                      value={officer.termEnd}
                    >
                      <Label>Term end</Label>
                      <Input placeholder='2026-06-30' />
                    </TextField>
                  </Card.Content>
                </Card>
              ))}

              <div className='flex flex-wrap gap-2'>
                <Button onPress={addOfficer} type='button' variant='secondary'>
                  Add officer
                </Button>
                <Button isDisabled={saving} type='submit' variant='primary'>
                  {saving ? 'Saving…' : 'Save officers'}
                </Button>
              </div>
            </Form>
          )}

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
