export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  return (
    <div className='mx-auto grid max-w-lg gap-4 py-12 text-center'>
      <h1 className='text-2xl font-bold'>You’re offline</h1>
      <p className='text-muted-foreground'>
        This page isn’t available without a connection. Check your network and
        try again.
      </p>
      <p>
        <a className='underline underline-offset-2' href='/'>
          Retry home
        </a>
      </p>
    </div>
  );
}
