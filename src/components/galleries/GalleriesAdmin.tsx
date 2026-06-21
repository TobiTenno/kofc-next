'use client';

import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
} from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const NEW_ALBUM_KEY = '__new__';

type AdminGallery = {
  id: string;
  title: string;
  description: string | null;
  immichAlbumId: string;
  allowMemberUploads: boolean;
  active: boolean;
  updatedAt: string;
};

type ImmichAlbumOption = {
  id: string;
  name: string;
  description: string;
  assetCount: number;
  thumbnailAssetId: string | null;
};

export const GalleriesAdmin = () => {
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbumOption[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [albumChoice, setAlbumChoice] = useState<string>(NEW_ALBUM_KEY);
  const [allowMemberUploads, setAllowMemberUploads] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );
  const [submitting, setSubmitting] = useState(false);

  const loadGalleries = useCallback(async (): Promise<void> => {
    const response = await fetch('/api/members/admin/galleries');
    const payload = (await response.json()) as { galleries?: AdminGallery[] };
    setGalleries(payload.galleries ?? []);
  }, []);

  const loadImmichAlbums = useCallback(async (): Promise<void> => {
    setAlbumsLoading(true);
    const response = await fetch('/api/members/admin/galleries/immich-albums');
    const payload = (await response.json()) as {
      albums?: ImmichAlbumOption[];
      error?: string;
    };

    if (response.ok) {
      setImmichAlbums(payload.albums ?? []);
    } else {
      setMessage(payload.error ?? 'Could not load Immich albums');
      setMessageTone('danger');
    }

    setAlbumsLoading(false);
  }, []);

  useEffect(() => {
    void loadGalleries();
    void loadImmichAlbums();
  }, [loadImmichAlbums, loadGalleries]);

  const selectedAlbum = useMemo(
    () => immichAlbums.find((album) => album.id === albumChoice) ?? null,
    [albumChoice, immichAlbums],
  );

  const applyAlbumSelection = (key: string): void => {
    setAlbumChoice(key);

    if (key === NEW_ALBUM_KEY) {
      return;
    }

    const album = immichAlbums.find((item) => item.id === key);
    if (!album) {
      return;
    }

    setTitle((current) => current.trim() || album.name);
    setDescription((current) => current.trim() || album.description);
  };

  const create = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const immichAlbumId =
      albumChoice === NEW_ALBUM_KEY ? undefined : albumChoice;

    const response = await fetch('/api/members/admin/galleries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || undefined,
        allowMemberUploads,
        immichAlbumId,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (response.ok) {
      setMessage('Gallery created');
      setMessageTone('success');
      setTitle('');
      setDescription('');
      setAlbumChoice(NEW_ALBUM_KEY);
      await Promise.all([loadGalleries(), loadImmichAlbums()]);
    } else {
      setMessage(payload.error ?? 'Create failed');
      setMessageTone('danger');
    }

    setSubmitting(false);
  };

  const patch = async (
    id: string,
    patchValues: Partial<
      Pick<AdminGallery, 'allowMemberUploads' | 'active' | 'title'>
    >,
  ): Promise<void> => {
    await fetch(`/api/members/admin/galleries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchValues),
    });
    await loadGalleries();
  };

  return (
    <div className='grid max-w-2xl gap-6'>
      <h1 className='text-2xl font-bold'>Galleries Admin</h1>

      <Card>
        <Card.Header>
          <Card.Title>New gallery</Card.Title>
          <Card.Description className='text-foreground/85'>
            Create a new Immich album or link one already on your council
            account.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onSubmit={create} className='grid gap-4'>
            <Select
              fullWidth
              selectedKey={albumChoice}
              onSelectionChange={(key) => {
                if (key == null) {
                  return;
                }
                applyAlbumSelection(String(key));
              }}
              isDisabled={albumsLoading}
            >
              <Label>Immich album</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={NEW_ALBUM_KEY} textValue='Create new album'>
                    Create new album
                  </ListBox.Item>
                  {immichAlbums.map((album) => (
                    <ListBox.Item
                      key={album.id}
                      id={album.id}
                      textValue={album.name}
                    >
                      {album.name} ({album.assetCount} photo
                      {album.assetCount === 1 ? '' : 's'})
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {selectedAlbum ? (
              <p className='text-sm text-muted-foreground'>
                Linking existing album &ldquo;{selectedAlbum.name}&rdquo;.
                {selectedAlbum.description
                  ? ` ${selectedAlbum.description}`
                  : ''}
              </p>
            ) : null}

            <TextField fullWidth isRequired value={title} onChange={setTitle}>
              <Label>Title</Label>
              <Input />
            </TextField>

            <TextField fullWidth value={description} onChange={setDescription}>
              <Label>Description</Label>
              <TextArea rows={2} />
            </TextField>

            <Switch
              isSelected={allowMemberUploads}
              onChange={setAllowMemberUploads}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>Allow member uploads</Label>
              </Switch.Content>
            </Switch>

            <Button
              type='submit'
              variant='primary'
              isDisabled={submitting}
              fullWidth
            >
              {submitting ? 'Creating…' : 'Create gallery'}
            </Button>
          </form>
        </Card.Content>
      </Card>

      <ul className='grid gap-3'>
        {galleries.map((gallery) => (
          <Card key={gallery.id}>
            <Card.Content className='grid gap-2 pt-4'>
              <div className='flex flex-wrap justify-between gap-2'>
                <div>
                  <Link
                    href={`/members/galleries/${gallery.id}`}
                    className='font-semibold underline'
                  >
                    {gallery.title}
                  </Link>
                  <p className='font-mono text-xs text-muted-foreground'>
                    album {gallery.immichAlbumId}
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='secondary'
                    className='min-h-11 touch-manipulation'
                    onPress={() =>
                      void patch(gallery.id, {
                        allowMemberUploads: !gallery.allowMemberUploads,
                      })
                    }
                  >
                    {gallery.allowMemberUploads
                      ? 'Disable uploads'
                      : 'Enable uploads'}
                  </Button>
                  <Button
                    size='sm'
                    variant='secondary'
                    className='min-h-11 touch-manipulation'
                    onPress={() =>
                      void patch(gallery.id, { active: !gallery.active })
                    }
                  >
                    {gallery.active ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
              {gallery.description ? (
                <p className='text-sm text-muted-foreground'>
                  {gallery.description}
                </p>
              ) : null}
            </Card.Content>
          </Card>
        ))}
      </ul>

      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
};
