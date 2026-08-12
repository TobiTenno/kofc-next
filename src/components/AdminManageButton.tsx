'use client';

import { Button } from '@heroui/react';
import SettingsIcon from '@mui/icons-material/Settings';

type AdminManageButtonProps = {
  'aria-label'?: string;
  'onPress': () => void;
};

/**
Standard admin settings-modal trigger: cog + "Manage".
*/
export const AdminManageButton = ({
  'aria-label': ariaLabel = 'Manage',
  onPress,
}: AdminManageButtonProps) => (
  <Button
    aria-label={ariaLabel}
    onPress={onPress}
    type='button'
    variant='secondary'
  >
    <SettingsIcon aria-hidden fontSize='small' />
    Manage
  </Button>
);
