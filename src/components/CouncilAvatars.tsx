import type { FC } from 'react';

import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Badge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';

import { useConfig } from '@/providers/council';
import { ImageName } from '@/schema/council';

const SmallAvatar = styled(Avatar)(({ theme }) => ({
  border: `2px solid ${theme.palette.background.paper}`,
  height: 22,
  width: 22,
}));

const TinyAvatar = styled(Avatar)(({ theme }) => ({
  border: `2px solid ${theme.palette.background.paper}`,
  height: 16,
  width: 16,
}));

export const CouncilAvatars: FC<{ size?: 'md' | 'sm' }> = ({ size }) => {
  const { council } = useConfig();
  if (!council?.officers || council.officers.length === 0) {
    return null;
  }
  return (
    <AvatarGroup
      max={4}
      total={
        size === 'sm'
          ? (Math.min(council.officers?.length, 4))
          : 0
      }
    >
      {council.officers?.map((officer) => {
        const badgeProps = {
          alt: officer.position,
          src: ImageName[officer.position],
        };
        const avatarProps = {
          alt: officer.name,
          src: officer.avatar ?? ImageName[officer.position],
        };
        return (
          <Badge
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            badgeContent={
              officer?.avatar
                ? (
                    size === 'sm'
                      ? (
                          <TinyAvatar {...badgeProps} />
                        )
                      : (
                          <SmallAvatar {...badgeProps} />
                        )
                  )
                : null
            }
            key={officer.position + officer.name}
            overlap='circular'
          >
            {size === 'sm'
              ? (
                  <SmallAvatar {...avatarProps} />
                )
              : (
                  <Avatar {...avatarProps} />
                )}
          </Badge>
        );
      })}
    </AvatarGroup>
  );
};
