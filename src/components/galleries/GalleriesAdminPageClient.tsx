'use client';

import { useState } from 'react';

import { AdminPageSurface } from '@/components/AdminPageSurface';
import { GalleriesAdmin } from '@/components/galleries/GalleriesAdmin';
import { GallerySettingsModal } from '@/components/galleries/GallerySettingsModal';

export const GalleriesAdminPageClient = ({
  immichConfigured,
}: {
  immichConfigured: boolean;
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!immichConfigured) {
    return (
      <AdminPageSurface
        description='Immich is not configured yet. Set the Immich URL and API key to create and manage galleries.'
        manageAriaLabel='Manage gallery settings'
        maxWidth='xl'
        onManage={() => setSettingsOpen(true)}
        title='Galleries Admin'
      >
        <GallerySettingsModal
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={(settings) => {
            if (settings.configured) {
              location.reload();
            }
          }}
        />
      </AdminPageSurface>
    );
  }

  return (
    <GalleriesAdmin
      onSettingsOpenChange={setSettingsOpen}
      settingsOpen={settingsOpen}
    />
  );
};
