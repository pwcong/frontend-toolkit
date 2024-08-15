import { DisposableStore } from './disposable-store';
import {
  markAsDisposed,
  setParentOfDisposable,
  trackDisposable,
} from './tracker';

export interface IDisposable {
  dispose: () => void;
}

export abstract class Disposable implements IDisposable {
  protected readonly _store: DisposableStore = new DisposableStore();

  constructor() {
    trackDisposable(this);

    setParentOfDisposable(this._store, this);
  }

  public dispose(): void {
    markAsDisposed(this);

    this._store.dispose();
  }

  protected _register<T extends IDisposable>(o: T): T {
    if ((o as unknown as Disposable) === this) {
      throw new Error('Cannot register a disposable on itself!');
    }
    return this._store.add(o);
  }
}

export const EmptyDisposable = Object.freeze<IDisposable>({
  dispose() {
    // DO NOTHING
  },
});

export class SafeDisposable<T extends IDisposable> implements IDisposable {
  private _value?: T;

  constructor(value: T) {
    this._value = value;
    trackDisposable(this);
  }

  get value(): T | undefined {
    return this._value;
  }

  isEmpty() {
    return this._value === undefined;
  }

  dispose() {
    if (!this._value) {
      return;
    }
    this._value.dispose();
    this._value = undefined;
    markAsDisposed(this);
  }
}
