import { useCallback, useEffect, useRef } from 'react';

/**
 * 挂载状态Hook
 * @returns
 */
export function useUnmounted() {
  const isUnmounted = useRef(false);

  const run = useCallback((fn: () => void) => {
    if (!isUnmounted.current) {
      fn();
    }
  }, []);

  useEffect(() => {
    isUnmounted.current = false;
    return () => {
      isUnmounted.current = true;
    };
  });

  return [isUnmounted, run] as const;
}
