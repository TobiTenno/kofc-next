'use client';

import { useEffect, useState } from 'react';

type PermissionKey =
  | 'sendCouncilEmail'
  | 'managePermissions'
  | 'manageEvents'
  | 'manageGalleries';

export default function PermissionsAdminPage() {
  const [permissions, setPermissions] = useState<
    Record<PermissionKey, string[]>
  >({
    sendCouncilEmail: [],
    managePermissions: [],
    manageEvents: [],
    manageGalleries: [],
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/members/admin/permissions')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.permissions) {
          setPermissions(payload.permissions);
        }
      });
  }, []);

  const save = async (key: PermissionKey): Promise<void> => {
    const response = await fetch('/api/members/admin/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        membershipNumbers: permissions[key],
      }),
    });

    setMessage(response.ok ? `Saved ${key}` : 'Save failed');
  };

  const updateList = (key: PermissionKey, value: string): void => {
    setPermissions((current) => ({
      ...current,
      [key]: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  return (
    <div className='grid gap-6 max-w-2xl'>
      <h1 className='text-2xl font-bold'>Permissions</h1>
      {(Object.keys(permissions) as PermissionKey[]).map((key) => (
        <div key={key} className='grid gap-2'>
          <label className='grid gap-1'>
            <span className='font-semibold'>{key}</span>
            <input
              className='border rounded px-3 py-2'
              value={permissions[key].join(', ')}
              onChange={(event) => updateList(key, event.target.value)}
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
