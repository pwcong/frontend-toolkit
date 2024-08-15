import { EmptyDisposable, IDisposable, SafeDisposable } from './disposable';

export function makeSafeDisposable(fn: (...args: any) => any) {
  const disposable = new SafeDisposable({
    dispose: fn,
  });
  return disposable;
}

export function makeEmptyDisposable() {
  return EmptyDisposable;
}

export function isDisposable<E = any>(thing: E): thing is E & IDisposable {
  return (
    typeof (thing as IDisposable).dispose === 'function' &&
    (thing as IDisposable).dispose.length === 0
  );
}
