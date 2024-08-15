import type { IBrandedService, ServiceIdentifier } from './base';
import { SyncDescriptor } from './descriptor';
import { ServiceCollection } from './service-cellection';

export enum InstantiationType {
  Eager = 0,
  Delayed = 1,
}

export class ServiceRegistry {
  protected readonly _registry: [
    ServiceIdentifier<any>,
    SyncDescriptor<any> | IBrandedService,
  ][] = [];

  get registry() {
    return this._registry;
  }

  register<T, Services extends IBrandedService[]>(
    id: ServiceIdentifier<T>,
    ctor: new (...services: Services) => T,
    supportsDelayedInstantiation?: InstantiationType,
  ): void;
  register<T>(id: ServiceIdentifier<T>, descriptor: SyncDescriptor<any>): void;
  register<T, Services extends IBrandedService[]>(
    id: ServiceIdentifier<T>,
    ctorOrDescriptor: (new (...services: Services) => T) | SyncDescriptor<any>,
    supportsDelayedInstantiation?: boolean | InstantiationType,
  ) {
    let _ctorOrDescriptor = ctorOrDescriptor;
    if (!(_ctorOrDescriptor instanceof SyncDescriptor)) {
      _ctorOrDescriptor = new SyncDescriptor<T>(
        _ctorOrDescriptor as new (...args: any[]) => T,
        [],
        Boolean(supportsDelayedInstantiation),
      );
    }

    this._registry.push([id, _ctorOrDescriptor]);
  }

  makeCollection(): ServiceCollection {
    const serviceCollection = new ServiceCollection();
    for (const [id, instanceOrDescriptor] of this.registry) {
      serviceCollection.set(id, instanceOrDescriptor);
    }
    return serviceCollection;
  }
}
