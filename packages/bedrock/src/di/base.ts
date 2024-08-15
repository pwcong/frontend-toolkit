export interface IBrandedService {
  _serviceBrand: undefined;
}

export interface ServiceIdentifier<T> {
  (...args: any[]): void;
  type: T;
}

export interface ServicesAccessor {
  get: <T>(id: ServiceIdentifier<T>) => T;
}

const serviceIds = new Map<string, ServiceIdentifier<any>>();

export const DI_TARGET = '$di$target';
export const DI_DEPENDENCIES = '$di$dependencies';

export function getServiceDependencies(
  ctor: any,
): { id: ServiceIdentifier<any>; index: number }[] {
  return ctor[DI_DEPENDENCIES] || [];
}

function storeServiceDependency(
  id: ServiceIdentifier<any>,
  ctor: any,
  index: number,
): void {
  if (ctor[DI_TARGET] === ctor) {
    ctor[DI_DEPENDENCIES].push({ id, index });
  } else {
    ctor[DI_DEPENDENCIES] = [{ id, index }];
    ctor[DI_TARGET] = ctor;
  }
}

export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  if (serviceIds.has(serviceId)) {
    return serviceIds.get(serviceId)!;
  }

  const id = function (target: any, key: string, index: number): any {
    if (arguments.length !== 3) {
      throw new Error(
        '@IServiceName-decorator can only be used to decorate a parameter',
      );
    }
    storeServiceDependency(id, target, index);
  } as any;

  id.toString = () => serviceId;

  serviceIds.set(serviceId, id);
  return id;
}

export function refineServiceDecorator<T1, T extends T1>(
  serviceIdentifier: ServiceIdentifier<T1>,
): ServiceIdentifier<T> {
  return serviceIdentifier as ServiceIdentifier<T>;
}
