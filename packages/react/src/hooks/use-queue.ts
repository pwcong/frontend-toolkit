import { useCallback, useRef } from 'react';

type IQueueFn<T> = (pv: T | void) => Promise<T | void>;

/**
 * 异步队列Hook
 * 队列回调函数依次执行
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
      // @ts-ignore
      queue.current.next = queue.current.next.catch(() => {}).then(fn);
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

/**
 * 尾队列Hook
 * 队列最后的回调函数执行
 * @returns
 */
export function useUnique<T = any>() {
  const indexRef = useRef(0);

  const run = useCallback(
    async (
      fn: IQueueFn<T>,
      onResolve: (result: T) => void,
      onFinal?: () => void
    ) => {
      indexRef.current += 1;
      const curIndex = indexRef.current;

      try {
        const res = await fn();

        if (curIndex === indexRef.current) {
          onResolve?.(res as T);
        }
      } finally {
        if (curIndex === indexRef.current) {
          onFinal?.();
        }
      }
    },
    []
  );

  return run;
}
