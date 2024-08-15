import { Capability, SharedCapability } from './compability';
import { Signal } from './signal';

import { assert, assertNotNil } from '@/assert';
import { listenOnce } from '@/event';

export class SharedMutex {
  private readonly _waitingWriters: Signal[] = [];

  private _writer?: Capability;

  private _waitingReader?: Signal;

  private _reader?: SharedCapability;

  /**
   * 是否被锁住
   */
  public isLocked() {
    return this._writer || this._readerCount !== 0;
  }

  /**
   * 等待并获取写锁
   */
  public lock(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this._writer) {
        const token = new Signal();
        this._waitingWriters.push(token);
        token.onActive(() => {
          this._writerEnterGate1(resolve);
        });
      } else {
        this._writerEnterGate1(resolve);
      }
    });
  }

  /**
   * 尝试获取写锁，立刻返回结果
   */
  public tryLock(): boolean {
    if (this._writer || this._readerCount > 0) {
      return false;
    }
    this.lock();
    return true;
  }

  /**
   * 解除写锁
   */
  public unLock(): void {
    assertNotNil(this._writer);

    this._writer.release();
  }

  /**
   * 等待并获取读锁
   */
  public lockShared(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this._writer) {
        if (!this._waitingReader) {
          this._waitingReader = new Signal();
        }
        this._waitingReader.onActive(() => {
          this._readerEnterGate1(resolve);
        });
      } else {
        this._readerEnterGate1(resolve);
      }
    });
  }

  /**
   * 尝试获取读锁，立刻返回结果
   */
  public tryLockShared(): boolean {
    if (this._writer) {
      return false;
    }
    this.lockShared();
    return true;
  }

  /**
   * 解除读锁
   */
  public unLockShared(): void {
    assertNotNil(this._reader);

    this._reader.release();
  }

  /**
   * 获取当前读者数量
   */
  private get _readerCount(): number {
    return this._reader ? this._reader.counter : 0;
  }

  /**
   * 写者进入第一道门
   */
  private _writerEnterGate1(resolve: () => void): void {
    assert(!this._writer);
    this._writer = new Capability();

    if (this._readerCount > 0) {
      listenOnce(this._reader!.onUnlocked)(() => {
        this._writerEnterGate2(resolve);
      });
    } else {
      this._writerEnterGate2(resolve);
    }
  }

  /**
   * 写者进入第二道门
   */
  private _writerEnterGate2(resolve: () => void): void {
    assertNotNil(this._writer);
    assert(this._readerCount === 0);

    this._writer.acquire();
    listenOnce(this._writer.onUnlocked)(() => {
      assertNotNil(this._writer);
      this._writer = undefined;
      this._moveForward();
    });
    resolve();
  }

  /**
   * 读者进入第一道门
   */
  private _readerEnterGate1(resolve: () => void): void {
    assert(!this._writer);

    this._waitingReader = undefined;

    if (!this._reader) {
      this._reader = new SharedCapability();
      this._reader.acquire();
      listenOnce(this._reader.onUnlocked)(() => {
        this._moveForward();
      });
    } else {
      this._reader.acquire();
    }
    resolve();
  }

  /**
   * 锁释放时推进流程
   */
  private _moveForward(): void {
    if (this._writer) {
      return;
    }

    if (this._waitingWriters.length > 0) {
      const signal = this._waitingWriters.shift()!;
      signal.notify();
      return;
    }

    if (this._waitingReader) {
      this._waitingReader.notify();
    }
  }
}
