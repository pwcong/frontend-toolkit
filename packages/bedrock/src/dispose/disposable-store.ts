import {
  markAsDisposed,
  setParentOfDisposable,
  trackDisposable,
} from './tracker';

import { IDisposable } from './disposable';

export class DisposableStore implements IDisposable {
  static DISABLE_DISPOSED_WARNING: boolean = false;

  private readonly _toDispose: Set<IDisposable> = new Set<IDisposable>();

  private _isDisposed: boolean = false;

  constructor() {
    trackDisposable(this);
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    markAsDisposed(this);
    this._isDisposed = true;
    this.clear();
  }

  public get isDisposed(): boolean {
    return this._isDisposed;
  }

  public clear(): void {
    if (this._toDispose.size === 0) {
      return;
    }

    const errors: any[] = [];
    for (const disposable of this._toDispose) {
      try {
        disposable.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

    this._toDispose.clear();

    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(
        errors,
        'Encountered errors while disposing of store',
      );
    }
  }

  public add<T extends IDisposable>(o: T): T {
    if (!o) {
      return o;
    }
    if ((o as unknown as DisposableStore) === this) {
      throw new Error('Cannot register a disposable on itself!');
    }

    setParentOfDisposable(o, this);
    if (this._isDisposed) {
      if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
        console.warn(
          new Error(
            'Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!',
          ).stack,
        );
      }
    } else {
      this._toDispose.add(o);
    }

    return o;
  }
}
