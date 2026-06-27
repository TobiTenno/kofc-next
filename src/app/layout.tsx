import { ThemeProvider } from '@mui/material/styles';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Image from 'next/image';
import Script from 'next/script';
import { DevCookieCleanup } from '@/components/DevCookieCleanup';
import { PwaRegister } from '@/components/PwaRegister';
import { SiteHeader } from '@/components/SiteHeader';
import { loadCouncilConfig } from '@/lib/council-config';
import { getPwaLabels, pwaThemeColorDark, pwaThemeColorLight } from '@/lib/pwa';
import { ColorSchemeProvider } from '@/providers/color-scheme';
import CouncilProvider from '@/providers/council';
import { AppRouterCacheProvider } from '@/providers/mui-cache';
import theme from '../theme';
import './globals.css';

export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: pwaThemeColorLight },
    { media: '(prefers-color-scheme: dark)', color: pwaThemeColorDark },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const { fullName, shortName, description } = getPwaLabels();

  return {
    title: fullName,
    description,
    applicationName: shortName,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: shortName,
      statusBarStyle: 'default',
    },
    formatDetection: {
      telephone: false,
    },
    robots: {
      index: true,
      follow: false,
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
      other: [
        {
          url: '/android-chrome-512x512.png',
          rel: 'android-chrome',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          url: '/android-chrome-192x192.png',
          rel: 'android-chrome',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          url: '/favicon-16x16.png',
          rel: 'icon',
          sizes: '16x16',
          type: 'image/png',
        },
        {
          url: '/favicon-32x32.png',
          rel: 'icon',
          sizes: '32x32',
          type: 'image/png',
        },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const councilConfig = loadCouncilConfig();
  const { council } = councilConfig;
  const footer = (
    <footer className='row-start-3 flex gap-[24px] flex-wrap items-center justify-center'>
      <a
        className='flex items-center gap-2 hover:underline hover:underline-offset-4'
        href={`https://www.kofc.org/en/index.html?ref=co${council?.number ?? ''}`}
        target='_blank'
        rel='noopener noreferrer'
      >
        <Image
          aria-hidden
          src='/file.svg'
          alt='File icon'
          width={16}
          height={16}
        />
        About
      </a>
    </footer>
  );

  return (
    <html lang='en' suppressHydrationWarning>
      <CouncilProvider value={councilConfig}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <ColorSchemeProvider>
              <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans grid min-h-dvh w-full min-w-0 grid-rows-[auto_1fr_auto] gap-4 bg-background px-3 py-3 text-foreground sm:gap-12 sm:px-8 sm:py-8 lg:gap-16 lg:px-12 lg:py-12`}
              >
                <Script
                  src='/color-scheme-init.js'
                  strategy='beforeInteractive'
                />
                <PwaRegister />
                {process.env.NODE_ENV === 'development' ? (
                  <DevCookieCleanup />
                ) : null}
                <div className='w-full min-w-0 justify-self-stretch'>
                  <SiteHeader />
                </div>
                <main className='w-full min-w-0 max-w-7xl justify-self-center'>
                  {children}
                </main>
                {footer}
              </body>
            </ColorSchemeProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </CouncilProvider>
    </html>
  );
}
