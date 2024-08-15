import { IDisposable } from '@/dispose';

const $globalThis: any = globalThis;

export const setTimeout0IsFaster =
  typeof $globalThis.postMessage === 'function' && !$globalThis.importScripts;

export const setTimeout0 = (() => {
  if (setTimeout0IsFaster) {
    interface IQueueElement {
      id: number;
      callback: () => void;
    }
    const pending: IQueueElement[] = [];

    $globalThis.addEventListener('message', (e: any) => {
      if (e?.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback: () => void) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback,
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, '*');
    };
  }
  return (callback: () => void) => setTimeout(callback);
})();

export interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleApi = Pick<
  typeof globalThis,
  'requestIdleCallback' | 'cancelIdleCallback'
>;

export const _runWhenIdle: (
  targetWindow: IdleApi,
  callback: (idle: IdleDeadline) => void,
  timeout?: number,
) => IDisposable =
  typeof globalThis.requestIdleCallback !== 'function' ||
  typeof globalThis.cancelIdleCallback !== 'function'
    ? (_targetWindow, runner) => {
        setTimeout0(() => {
          if (disposed) {
            return;
          }
          const end = Date.now() + 15; // one frame at 64fps
          const deadline: IdleDeadline = {
            didTimeout: true,
            timeRemaining() {
              return Math.max(0, end - Date.now());
            },
          };
          runner(Object.freeze(deadline));
        });
        let disposed = false;
        return {
          dispose() {
            if (disposed) {
              return;
            }
            disposed = true;
          },
        };
      }
    : (targetWindow: IdleApi, runner, timeout?) => {
        const handle: number = targetWindow.requestIdleCallback(
          runner,
          typeof timeout === 'number' ? { timeout } : undefined,
        );
        let disposed = false;
        return {
          dispose() {
            if (disposed) {
              return;
            }
            disposed = true;
            targetWindow.cancelIdleCallback(handle);
          },
        };
      };

export abstract class AbstractIdleValue<T> {
  private readonly _executor: () => void;

  private readonly _handle: IDisposable;

  private _didRun: boolean = false;

  private _value?: T;

  private _error: unknown;

  constructor(targetWindow: IdleApi, executor: () => T) {
    this._executor = () => {
      try {
        this._value = executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._didRun = true;
      }
    };
    this._handle = _runWhenIdle(targetWindow, () => this._executor());
  }

  dispose(): void {
    this._handle.dispose();
  }

  get value(): T {
    if (!this._didRun) {
      this._handle.dispose();
      this._executor();
    }
    if (this._error) {
      throw this._error;
    }
    return this._value!;
  }

  get isInitialized(): boolean {
    return this._didRun;
  }
}

export class GlobalIdleValue<T> extends AbstractIdleValue<T> {
  constructor(executor: () => T) {
    super(globalThis, executor);
  }
}
