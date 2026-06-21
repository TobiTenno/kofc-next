'use client';

import type { ColorSchemePreference } from '@/lib/color-scheme';
import { useColorScheme } from '@/providers/color-scheme';

const options: Array<{
  value: ColorSchemePreference;
  label: string;
  shortLabel: string;
}> = [
  { value: 'system', label: 'System theme', shortLabel: 'System' },
  { value: 'light', label: 'Day theme', shortLabel: 'Day' },
  { value: 'dark', label: 'Night theme', shortLabel: 'Night' },
];

const ThemeIcon = ({ mode }: { mode: ColorSchemePreference }) => {
  if (mode === 'light') {
    return (
      <svg
        aria-hidden
        className='h-3.5 w-3.5'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <circle cx='12' cy='12' r='4' />
        <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41' />
      </svg>
    );
  }

  if (mode === 'dark') {
    return (
      <svg
        aria-hidden
        className='h-3.5 w-3.5'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <path d='M21 14.5A7.5 7.5 0 0 1 9.5 3a6 6 0 1 0 8 11.5Z' />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      className='h-3.5 w-3.5'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <rect x='2' y='3' width='20' height='14' rx='2' />
      <path d='M8 21h8M12 17v4' />
    </svg>
  );
};

type ThemeToggleProps = {
  /** Icon-only labels on small breakpoints */
  compact?: boolean;
  className?: string;
};

export const ThemeToggle = ({
  compact = false,
  className = '',
}: ThemeToggleProps) => {
  const { preference, setPreference } = useColorScheme();

  return (
    <fieldset className={`theme-toggle ${className}`}>
      <legend className='sr-only'>Color scheme</legend>
      {options.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type='button'
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => setPreference(option.value)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium touch-manipulation transition-colors ${
              active
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ThemeIcon mode={option.value} />
            {compact ? (
              <span className='sr-only'>{option.shortLabel}</span>
            ) : (
              <span className='hidden sm:inline'>{option.shortLabel}</span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
};
