'use client';

import { useEffect, useState } from 'react';
import {
  emptyPermissionDrafts,
  formatMembershipNumbers,
  PERMISSION_KEYS,
  type PermissionKey,
  parseMembershipNumbers,
} from '@/lib/utilities';

export default function PermissionsAdminPage() {
  const [drafts, setDrafts] = useState(emptyPermissionDrafts);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/members/admin/permissions')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.permissions) {
          const next = emptyPermissionDrafts();
          for (const key of PERMISSION_KEYS) {
            next[key] = formatMembershipNumbers(payload.permissions[key] ?? []);
          }
          setDrafts(next);
        }
      });
  }, []);

  const save = async (key: PermissionKey): Promise<void> => {
    const membershipNumbers = parseMembershipNumbers(drafts[key]);
    const response = await fetch('/api/members/admin/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        membershipNumbers,
      }),
    });

    if (response.ok) {
      setDrafts((current) => ({
        ...current,
        [key]: formatMembershipNumbers(membershipNumbers),
      }));
      setMessage(`Saved ${key}`);
    } else {
      setMessage('Save failed');
    }
  };

  return (
    <div className='grid gap-6 max-w-2xl'>
      <h1 className='text-2xl font-bold'>Permissions</h1>
      {PERMISSION_KEYS.map((key) => (
        <div key={key} className='grid gap-2'>
          <label className='grid gap-1'>
            <span className='font-semibold'>{key}</span>
            <input
              className='border rounded px-3 py-2'
              value={drafts[key]}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
          <button
            type='button'
            onClick={() => void save(key)}
            className='rounded bg-blue-900 text-white px-4 py-2 w-fit'
          >
            Save
          </button>
        </div>
      ))}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
