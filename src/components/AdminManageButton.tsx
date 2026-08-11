'use client';

import { Button } from '@heroui/react';
import SettingsIcon from '@mui/icons-material/Settings';

type AdminManageButtonProps = {
  onPress: () => void;
  'aria-label'?: string;
};

/** Standard admin settings-modal trigger: cog + "Manage". */
export const AdminManageButton = ({
  onPress,
  'aria-label': ariaLabel = 'Manage',
}: AdminManageButtonProps) => (
  <Button
    type='button'
    variant='secondary'
    aria-label={ariaLabel}
    onPress={onPress}
  >
    <SettingsIcon fontSize='small' aria-hidden />
    Manage
  </Button>
);
