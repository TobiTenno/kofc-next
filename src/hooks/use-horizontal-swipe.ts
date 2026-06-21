'use client';

import { useRef } from 'react';

const SWIPE_THRESHOLD_PX = 48;

export const useHorizontalSwipe = (options: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
}) => {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (event: React.TouchEvent) => {
      if (options.enabled === false) {
        return;
      }

      const touch = event.changedTouches[0] ?? event.touches[0];
      if (!touch) {
        return;
      }

      start.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (event: React.TouchEvent) => {
      if (options.enabled === false || !start.current) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        start.current = null;
        return;
      }

      const deltaX = touch.clientX - start.current.x;
      const deltaY = touch.clientY - start.current.y;
      start.current = null;

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        options.onSwipeLeft();
      } else {
        options.onSwipeRight();
      }
    },
  };
};
