import { Emitter, type Event } from '@/event';

/**
 * 信号
 */
export class Signal {
  private readonly _onActive: Emitter<[]> = new Emitter<[]>();

  public onActive: Event<[]> = this._onActive.event;

  constructor() {
    this.onActive = this._onActive.event;
  }

  public notify(): void {
    this._onActive.fire();
  }
}
