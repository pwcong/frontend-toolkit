export interface IBarrier {
  isOpen: () => boolean;
  open: () => void;
  wait: () => Promise<boolean>;
}

export class Barrier {
  private _isOpen: boolean;

  private readonly _promise: Promise<boolean>;

  private _completePromise!: (v: boolean) => void;

  private _rejectPromise!: (e: unknown) => void;

  constructor() {
    this._isOpen = false;
    this._promise = new Promise<boolean>((resolve, reject) => {
      this._completePromise = resolve;
      this._rejectPromise = reject;
    });
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this._completePromise(true);
  }

  reject(e: unknown): void {
    this._rejectPromise(e);
  }

  wait(): Promise<boolean> {
    return this._promise;
  }
}
