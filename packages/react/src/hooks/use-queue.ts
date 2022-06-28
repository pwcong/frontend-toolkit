import { useCallback, useRef } from 'react';

type IQueueFn<T> = (pv: T | void) => Promise<T | void>;

/**
 * 异步队列Hook
 * @returns
 */
export function useQueue<T = any>() {
  const queue = useRef({
    size: 0,
    next: Promise.resolve<T | void>(undefined),
  });

  const run = useCallback(async (fn: IQueueFn<T>, onComplete?: () => void) => {
    queue.current.size++;
    try {
      queue.current.next = queue.current.next.then(fn);
      await queue.current.next;
    } finally {
      queue.current.size--;
      if (queue.current.size <= 0) {
        onComplete?.();
      }
    }
  }, []);

  return [queue, run] as const;
}
