import { type Event } from './event';

import { IDisposable } from '@/dispose';

export function listenOnce<TArgs extends any[]>(
  event: Event<TArgs>,
): Event<TArgs> {
  return (listener, thisArgs = null) => {
    let didFire = false;

    let result: IDisposable | undefined = undefined;
    result = event((...args) => {
      if (didFire) {
        return undefined;
      }

      if (result) {
        result.dispose();
      } else {
        didFire = true;
      }

      return listener.call(thisArgs, ...args);
    }, null);

    if (didFire) {
      result.dispose();
    }

    return result;
  };
}
