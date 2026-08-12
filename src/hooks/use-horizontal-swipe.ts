'use client';

import { useRef } from 'react';

const SWIPE_THRESHOLD_PX = 48;

export const useHorizontalSwipe = (options: {
  enabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) => {
  const startRef = useRef<null | { x: number; y: number }>(null);

  return {
    onTouchEnd: (event: React.TouchEvent) => {
      if (options.enabled === false || !startRef.current) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        startRef.current = null;
        return;
      }

      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;
      startRef.current = null;

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX
        || Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        options.onSwipeLeft();
      }
      else {
        options.onSwipeRight();
      }
    },
    onTouchStart: (event: React.TouchEvent) => {
      if (options.enabled === false) {
        return;
      }

      const touch = event.changedTouches[0] ?? event.touches[0];
      if (!touch) {
        return;
      }

      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
  };
};
