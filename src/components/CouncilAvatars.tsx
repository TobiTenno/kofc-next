import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Badge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';
import type { FC } from 'react';
import { useConfig } from '@/providers/council';
import { ImageName } from '@/schema/council';

const SmallAvatar = styled(Avatar)(({ theme }) => ({
  width: 22,
  height: 22,
  border: `2px solid ${theme.palette.background.paper}`,
}));

const TinyAvatar = styled(Avatar)(({ theme }) => ({
  width: 16,
  height: 16,
  border: `2px solid ${theme.palette.background.paper}`,
}));

export const CouncilAvatars: FC<{ size?: 'sm' | 'md' }> = ({ size }) => {
  const { council } = useConfig();
  if (!council?.officers || council.officers.length === 0) {
    return null;
  }
  return (
    <AvatarGroup
      max={4}
      total={
        size === 'sm'
          ? council.officers?.length > 4
            ? 4
            : council.officers?.length
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
            key={officer.position + officer.name}
            overlap='circular'
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              officer?.avatar ? (
                size === 'sm' ? (
                  <TinyAvatar {...badgeProps} />
                ) : (
                  <SmallAvatar {...badgeProps} />
                )
              ) : null
            }
          >
            {size === 'sm' ? (
              <SmallAvatar {...avatarProps} />
            ) : (
              <Avatar {...avatarProps} />
            )}
          </Badge>
        );
      })}
    </AvatarGroup>
  );
};
