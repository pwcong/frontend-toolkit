import { useEffect, useRef as useOriginRef } from 'react';

/**
 * 缓存值Hook
 * @param value 值
 * @returns
 */
export function useRef<T = unknown>(value: T) {
  const ref = useOriginRef<T>(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
