import { EmptyDisposable, IDisposable } from './disposable';

let disposableTracker: IDisposableTracker | null = null;

export interface IDisposableTracker {
  trackDisposable: (disposable: IDisposable) => void;

  setParent: (child: IDisposable, parent: IDisposable | null) => void;

  markAsDisposed: (disposable: IDisposable) => void;
}

function makeDisposableTracker() {
  const __is_disposable_tracked__ = '__is_disposable_tracked__';
  return new (class implements IDisposableTracker {
    trackDisposable(x: IDisposable): void {
      const stack = new Error('Potentially leaked disposable').stack!;
      setTimeout(() => {
        if (!(x as any)[__is_disposable_tracked__]) {
          console.log(stack);
        }
      }, 3000);
    }

    setParent(child: IDisposable, _parent: IDisposable | null): void {
      if (child && child !== EmptyDisposable) {
        try {
          (child as any)[__is_disposable_tracked__] = true;
        } catch {
          // DO NOTHING
        }
      }
    }

    markAsDisposed(disposable: IDisposable): void {
      if (disposable && disposable !== EmptyDisposable) {
        try {
          (disposable as any)[__is_disposable_tracked__] = true;
        } catch {
          // DO NOTHING
        }
      }
    }
  })();
}

export function enableDisposableTracker(
  tracker: IDisposableTracker = makeDisposableTracker(),
) {
  setDisposableTracker(tracker);
}

export function setDisposableTracker(tracker: IDisposableTracker | null): void {
  disposableTracker = tracker;
}

export function trackDisposable<T extends IDisposable>(x: T): T {
  disposableTracker?.trackDisposable(x);
  return x;
}

export function markAsDisposed(disposable: IDisposable): void {
  disposableTracker?.markAsDisposed(disposable);
}

export function setParentOfDisposable(
  child: IDisposable,
  parent: IDisposable | null,
): void {
  disposableTracker?.setParent(child, parent);
}
