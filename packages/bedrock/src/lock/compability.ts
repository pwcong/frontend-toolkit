import { assert } from '@/assert';
import { Emitter, type Event } from '@/event';

/**
 * 资源状态
 */
export enum CapabilityStatus {
  Unlocked,
  Locked,
}

/**
 * 独享的资源
 */
export class Capability {
  private _status: CapabilityStatus = CapabilityStatus.Unlocked;

  private readonly _onUnlocked: Emitter<[]> = new Emitter<[]>();

  public onUnlocked: Event<[]> = this._onUnlocked.event;

  get status(): CapabilityStatus {
    return this._status;
  }

  /** 获取控制权 */
  public acquire(): void {
    assert(this._status === CapabilityStatus.Unlocked);
    this._status = CapabilityStatus.Locked;
  }

  /** 释放控制权 */
  public release(): void {
    assert(this._status === CapabilityStatus.Locked);
    this._status = CapabilityStatus.Unlocked;
    this._onUnlocked.fire();
  }
}

/**
 * 共享的资源
 */
export class SharedCapability {
  private _status: CapabilityStatus = CapabilityStatus.Unlocked;

  private _counter: number = 0;

  private readonly _onUnlocked: Emitter<[]> = new Emitter<[]>();

  public onUnlocked: Event<[]> = this._onUnlocked.event;

  get status(): CapabilityStatus {
    return this._status;
  }

  get counter(): number {
    return this._counter;
  }

  /** 获取控制权 */
  public acquire() {
    if (this._status === CapabilityStatus.Unlocked) {
      this._status = CapabilityStatus.Locked;
    }
    this._counter++;
  }

  /** 释放控制权 */
  public release() {
    assert(this._counter > 0);
    this._counter--;
    if (this._counter === 0) {
      this._status = CapabilityStatus.Unlocked;
      this._onUnlocked.fire();
    }
  }
}
