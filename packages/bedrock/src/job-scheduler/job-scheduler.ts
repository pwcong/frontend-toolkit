import type { AbstractJob } from './abstract-job';

import { IErrorRef, makeOk } from '@/error';
import { Disposable } from '@/dispose';
import { assert } from '@/assert';

export class JobScheduler<T, K extends T = T> extends Disposable {
  private readonly _jobPools: Map<string, AbstractJob<T, K>> = new Map();

  constructor(private _currentPhase: K) {
    super();
  }

  get currentPhase() {
    return this._currentPhase;
  }

  addJob(job: AbstractJob<T, K>) {
    assert(!this._jobPools.has(job.name), 'cant duplicate add job.');
    this._jobPools.set(job.name, job);
  }

  removeJob(jobName: string) {
    this._jobPools.delete(jobName);
  }

  prepare(phase: K) {
    for (const [, job] of this._jobPools) {
      job.prepare(phase);
    }
  }

  async wait(phase: K): Promise<IErrorRef> {
    const jobPromises: Promise<void>[] = [];
    for (const [, job] of this._jobPools) {
      jobPromises.push(job.wait(phase));
    }
    try {
      await Promise.all(jobPromises);
      this._currentPhase = phase;
      return makeOk();
    } finally {
      // DO NOTHING
    }
  }

  dispose() {
    this._jobPools.forEach(job => job.dispose());
    this._jobPools.clear();
    super.dispose();
  }
}
