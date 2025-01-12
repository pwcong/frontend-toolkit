import { IBarrier } from '@/async';
import { Disposable } from '@/dispose';

export abstract class AbstractJob<T, K extends T = T> extends Disposable {
  protected abstract _name: string;

  protected _jobStore: Map<K, IBarrier[]> = new Map();

  get name() {
    return this._name;
  }

  wait(phase: K): Promise<void> {
    const barriers = this._jobStore.get(phase);
    if (!barriers?.length) {
      return Promise.resolve();
    }
    return Promise.all(
      barriers.map(barrier => barrier.wait()),
    ) as unknown as Promise<void>;
  }

  prepare(phase: K) {
    this._executePhase(phase);
  }

  protected _setBarrier(phase: K, barrier: IBarrier) {
    if (!this._jobStore.has(phase)) {
      this._jobStore.set(phase, []);
    }
    const barriers = this._jobStore.get(phase)!;
    barriers.push(barrier);
  }

  protected abstract _executePhase(phase: K): void;
}
