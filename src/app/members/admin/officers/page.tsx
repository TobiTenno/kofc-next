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
  id: string;
  name: string;
  position: Position;
  termEnd: string;
  email: string;
  phone: string;
  membershipNumber: string;
};

const createDraftId = (): string =>
  `officer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyOfficer = (): OfficerDraft => ({
  id: createDraftId(),
  name: '',
  position: Position.GrandKnight,
  termEnd: '',
  email: '',
  phone: '',
  membershipNumber: '',
});

const toDraft = (officer: {
  name: string;
  position: Position;
  termEnd?: string;
  email?: string;
  phone?: string;
  membershipNumber?: string;
}): OfficerDraft => ({
  id: createDraftId(),
  name: officer.name,
  position: officer.position,
  termEnd: officer.termEnd ?? '',
  email: officer.email ?? '',
  phone: officer.phone ?? '',
  membershipNumber: officer.membershipNumber ?? '',
});

export default function OfficersAdminPage() {
  const [officers, setOfficers] = useState<OfficerDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpIndex, setLookingUpIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  useEffect(() => {
    void fetch('/api/members/admin/officers')
      .then(async (response) => {
        const payload = (await response.json()) as {
          officers?: Array<{
            name: string;
            position: Position;
            termEnd?: string;
            email?: string;
            phone?: string;
            membershipNumber?: string;
          }>;
          error?: string;
        };
        if (!response.ok) {
          setMessageTone('danger');
          setMessage(payload.error ?? 'Could not load officers');
          return;
        }
        setOfficers((payload.officers ?? []).map(toDraft));
      })
      .finally(() => setLoading(false));
  }, []);

  const updateOfficer = (index: number, patch: Partial<OfficerDraft>): void => {
    setOfficers((current) =>
      current.map((officer, i) =>
        i === index ? { ...officer, ...patch } : officer,
      ),
    );
  };

  const addOfficer = (): void => {
    const used = new Set(officers.map((officer) => officer.position));
    const nextPosition =
      ALL_OFFICER_POSITIONS.find((position) => !used.has(position)) ??
      Position.GrandKnight;
    setOfficers((current) => [
      ...current,
      { ...emptyOfficer(), position: nextPosition },
    ]);
  };

  const removeOfficer = (index: number): void => {
    setOfficers((current) => current.filter((_, i) => i !== index));
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber }),
    });
    const payload = (await response.json()) as {
      member?: {
        membershipNumber: string;
        name: string;
        email: string | null;
        phone: string | null;
      };
      error?: string;
    };

    if (!response.ok || !payload.member) {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Member lookup failed');
      setLookingUpIndex(null);
      return;
    }

    updateOfficer(index, {
      membershipNumber: payload.member.membershipNumber,
      name: payload.member.name,
      email: payload.member.email ?? '',
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
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officers: officers.map((officer) => ({
          name: officer.name,
          position: officer.position,
          termEnd: officer.termEnd || undefined,
          email: officer.email || undefined,
          phone: officer.phone || undefined,
          membershipNumber: officer.membershipNumber || undefined,
        })),
      }),
    });

    const payload = (await response.json()) as {
      officers?: Array<{
        name: string;
        position: Position;
        termEnd?: string;
        email?: string;
        phone?: string;
        membershipNumber?: string;
      }>;
      error?: string;
    };

    if (response.ok && payload.officers) {
      setOfficers(payload.officers.map(toDraft));
      setMessageTone('success');
      setMessage('Officers saved');
    } else {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Save failed');
    }

    setSaving(false);
  };

  return (
    <AdminPageSurface
      title='Officers Admin'
      description='Edit council officers stored in council.json. Set membership number (and look up from roster) so roster access and Financial Secretary tools resolve correctly.'
      maxWidth='3xl'
    >
      {loading ? (
        <p className='text-sm text-muted-foreground'>Loading…</p>
      ) : (
        <Form onSubmit={save} className='grid gap-6'>
          {officers.map((officer, index) => (
            <Card key={officer.id}>
              <Card.Header>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <Card.Title>{officer.position || 'Officer'}</Card.Title>
                  <Button
                    type='button'
                    size='sm'
                    variant='danger'
                    onPress={() => removeOfficer(index)}
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
                  selectedKey={officer.position}
                  onSelectionChange={(key) => {
                    if (key == null) {
                      return;
                    }
                    updateOfficer(index, {
                      position: String(key) as Position,
                    });
                  }}
                >
                  <Label>Position</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ALL_OFFICER_POSITIONS.map((position) => (
                        <ListBox.Item
                          key={position}
                          id={position}
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
                    value={officer.membershipNumber}
                    onChange={(value) =>
                      updateOfficer(index, { membershipNumber: value })
                    }
                  >
                    <Label>Membership number</Label>
                    <Input placeholder='2302265' />
                  </TextField>
                  <Button
                    type='button'
                    variant='secondary'
                    isDisabled={lookingUpIndex === index}
                    onPress={() => void lookupMember(index)}
                  >
                    {lookingUpIndex === index ? 'Looking up…' : 'Look up'}
                  </Button>
                </div>

                <TextField
                  fullWidth
                  isRequired
                  value={officer.name}
                  onChange={(value) => updateOfficer(index, { name: value })}
                >
                  <Label>Name</Label>
                  <Input />
                </TextField>

                <TextField
                  fullWidth
                  value={officer.email}
                  onChange={(value) => updateOfficer(index, { email: value })}
                >
                  <Label>Email</Label>
                  <Input type='email' />
                </TextField>

                <TextField
                  fullWidth
                  value={officer.phone}
                  onChange={(value) => updateOfficer(index, { phone: value })}
                >
                  <Label>Phone</Label>
                  <Input />
                </TextField>

                <TextField
                  fullWidth
                  value={officer.termEnd}
                  onChange={(value) => updateOfficer(index, { termEnd: value })}
                >
                  <Label>Term end</Label>
                  <Input placeholder='2026-06-30' />
                </TextField>
              </Card.Content>
            </Card>
          ))}

          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='secondary' onPress={addOfficer}>
              Add officer
            </Button>
            <Button type='submit' variant='primary' isDisabled={saving}>
              {saving ? 'Saving…' : 'Save officers'}
            </Button>
          </div>
        </Form>
      )}

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
