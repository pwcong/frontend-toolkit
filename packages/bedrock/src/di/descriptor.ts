export class SyncDescriptor<T> {
  readonly ctor: new (...args: any[]) => T;

  readonly staticArguments: any[];

  readonly supportsDelayedInstantiation: boolean;

  constructor(
    ctor: new (...args: any[]) => T,
    staticArguments: any[] = [],
    supportsDelayedInstantiation = true,
  ) {
    this.ctor = ctor;
    this.staticArguments = staticArguments;
    this.supportsDelayedInstantiation = supportsDelayedInstantiation;
  }
}

export interface SyncDescriptor0<T> {
  readonly ctor: new () => T;
}
