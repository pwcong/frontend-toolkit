import { IContainerService } from './interface';

import { isDisposable } from '@/dispose';

import { InstantiationService, ServiceCollection, SyncDescriptor } from '@/di';

export * from './interface';

export class ContainerService
  extends InstantiationService
  implements IContainerService
{
  private readonly _childs: Set<ContainerService> = new Set<ContainerService>();

  constructor(services: ServiceCollection, parent?: ContainerService) {
    super(services, parent);
    if (this._parent instanceof ContainerService) {
      this._parent._childs.add(this);
    }
  }

  createChild(serviceCollection: ServiceCollection) {
    return new ContainerService(serviceCollection, this);
  }

  dispose() {
    for (const child of this._childs) {
      child.dispose();
    }

    if (this._parent instanceof ContainerService) {
      this._parent._childs.delete(this);
    }

    for (const [, instanceOrDescriptor] of this._services.entries) {
      if (instanceOrDescriptor instanceof SyncDescriptor) {
        continue;
      }
      if (instanceOrDescriptor === this) {
        continue;
      }
      if (isDisposable(instanceOrDescriptor)) {
        instanceOrDescriptor.dispose();
      }
    }
  }
}
