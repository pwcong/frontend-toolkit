import { SyncDescriptor, SyncDescriptor0 } from './descriptor';
import { ServiceCollection } from './service-cellection';
import {
  IBrandedService,
  createDecorator,
  getServiceDependencies,
  ServiceIdentifier,
  ServicesAccessor,
} from './base';
import { Trace } from './trace';

import { DisposableStore } from '@/dispose';
import { Graph } from '@/structure';
import { GlobalIdleValue } from '@/async';

export type GetLeadingNonServiceArgs<TArgs extends any[]> = TArgs extends []
  ? []
  : TArgs extends [...infer TFirst, IBrandedService]
  ? GetLeadingNonServiceArgs<TFirst>
  : TArgs;

export interface IInstantiationService {
  readonly _serviceBrand: undefined;

  createInstance: (<T>(descriptor: SyncDescriptor0<T>) => T) &
    (<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(
      ctor: Ctor,
      ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
    ) => R);

  invokeFunction: <R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ) => R;

  createChild: (
    services: ServiceCollection,
    store?: DisposableStore,
  ) => IInstantiationService;
}

export const IInstantiationService = createDecorator<IInstantiationService>(
  'instantiation-service',
);

type DepGraph = Graph<string, any>;

const _enableAllTracing = false;
class CyclicDependencyError extends Error {
  constructor(graph: DepGraph) {
    super('cyclic dependency between services');
    this.message =
      graph.findCycleSlow() ??
      `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`;
  }
}

export class InstantiationService implements IInstantiationService {
  declare _serviceBrand: undefined;

  declare _globalGraph?: DepGraph;

  protected readonly _services: ServiceCollection = new ServiceCollection();

  protected readonly _parent?: InstantiationService;

  protected readonly _enableTracing: boolean = _enableAllTracing;

  private _globalGraphImplicitDependency?: string;

  private readonly _activeInstantiations: Set<ServiceIdentifier<any>> =
    new Set();

  constructor(
    services: ServiceCollection = new ServiceCollection(),
    parent?: InstantiationService,
    enableTracing: boolean = _enableAllTracing,
  ) {
    this._services = services;
    this._parent = parent;
    this._enableTracing = enableTracing;

    this._services.set(IInstantiationService, this);
    if (enableTracing) {
      this._globalGraph = parent?._globalGraph ?? new Graph(e => e);
    }
  }

  createChild(services: ServiceCollection): IInstantiationService {
    return new InstantiationService(services, this, this._enableTracing);
  }

  invokeFunction<R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R {
    const _trace = Trace.traceInvocation(this._enableTracing, fn);
    let _done = false;
    try {
      const accessor: ServicesAccessor = {
        get: <T>(id: ServiceIdentifier<T>) => {
          if (_done) {
            throw new Error(
              'service accessor is only valid during the invocation of its target method',
            );
          }

          const result = this._getOrCreateServiceInstance(id, _trace);
          if (!result) {
            throw new Error(`[invokeFunction] unknown service '${id}'`);
          }
          return result;
        },
      };
      return fn(accessor, ...args);
    } finally {
      _done = true;
      _trace.stop();
    }
  }

  createInstance<T>(descriptor: SyncDescriptor0<T>): T;
  createInstance<
    Ctor extends new (...args: any[]) => any,
    R extends InstanceType<Ctor>,
  >(
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R;
  createInstance(
    ctorOrDescriptor: any | SyncDescriptor<any>,
    ...rest: any[]
  ): any {
    let _trace: Trace;
    let result: any;
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
      result = this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(rest),
        _trace,
      );
    } else {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
      result = this._createInstance(ctorOrDescriptor, rest, _trace);
    }
    _trace.stop();
    return result;
  }

  private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {
    const serviceDependencies = getServiceDependencies(ctor).sort(
      (a, b) => a.index - b.index,
    );
    const serviceArgs: any[] = [];
    for (const dependency of serviceDependencies) {
      const service = this._getOrCreateServiceInstance(dependency.id, _trace);
      if (!service) {
        throw new Error(
          `[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`,
        );
      }
      serviceArgs.push(service);
    }

    const firstServiceArgPos =
      serviceDependencies.length > 0
        ? serviceDependencies[0].index
        : args.length;

    let _args = [...args];
    if (_args.length !== firstServiceArgPos) {
      console.trace(
        `[createInstance] First service dependency of ${
          ctor.name
        } at position ${firstServiceArgPos + 1} conflicts with ${
          _args.length
        } static arguments`,
      );

      const delta = firstServiceArgPos - _args.length;
      if (delta > 0) {
        _args = _args.concat(new Array(delta));
      } else {
        _args = _args.slice(0, firstServiceArgPos);
      }
    }

    return Reflect.construct<any, T>(ctor, _args.concat(serviceArgs));
  }

  private _setCreatedServiceInstance<T>(
    id: ServiceIdentifier<T>,
    instance: T,
  ): void {
    if (this._services.get(id) instanceof SyncDescriptor) {
      this._services.set(id, instance);
    } else if (this._parent) {
      this._parent._setCreatedServiceInstance(id, instance);
    } else {
      throw new Error('illegalState - setting UNKNOWN service instance');
    }
  }

  private _getServiceInstanceOrDescriptor<T>(
    id: ServiceIdentifier<T>,
  ): T | SyncDescriptor<T> {
    const instanceOrDesc = this._services.get(id);
    if (!instanceOrDesc && this._parent) {
      return this._parent._getServiceInstanceOrDescriptor(id);
    } else {
      return instanceOrDesc;
    }
  }

  protected _getOrCreateServiceInstance<T>(
    id: ServiceIdentifier<T>,
    _trace: Trace,
  ): T {
    if (this._globalGraph && this._globalGraphImplicitDependency) {
      this._globalGraph.insertEdge(
        this._globalGraphImplicitDependency,
        String(id),
      );
    }
    const thing = this._getServiceInstanceOrDescriptor(id);
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(
        id,
        thing,
        _trace.branch(id, true),
      );
    } else {
      _trace.branch(id, false);
      return thing;
    }
  }

  private _safeCreateAndCacheServiceInstance<T>(
    id: ServiceIdentifier<T>,
    desc: SyncDescriptor<T>,
    _trace: Trace,
  ): T {
    if (this._activeInstantiations.has(id)) {
      throw new Error(
        `illegal state - RECURSIVELY instantiating service '${id}'`,
      );
    }
    this._activeInstantiations.add(id);
    try {
      return this._createAndCacheServiceInstance(id, desc, _trace);
    } finally {
      this._activeInstantiations.delete(id);
    }
  }

  private _createAndCacheServiceInstance<T>(
    id: ServiceIdentifier<T>,
    desc: SyncDescriptor<T>,
    _trace: Trace,
  ): T {
    type Triple = {
      id: ServiceIdentifier<any>;
      desc: SyncDescriptor<any>;
      _trace: Trace;
    };
    const graph = new Graph<string, Triple>((data: any) => data.id.toString());

    let cycleCount = 0;
    const stack = [{ id, desc, _trace }];
    while (stack.length) {
      const item = stack.pop()!;
      graph.lookupOrInsertNode(item);

      if (cycleCount++ > 1000) {
        throw new CyclicDependencyError(graph);
      }

      for (const dependency of getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(
          dependency.id,
        );
        if (!instanceOrDesc) {
          throw new Error(
            `[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`,
          );
        }

        this._globalGraph?.insertEdge(String(item.id), String(dependency.id));

        if (instanceOrDesc instanceof SyncDescriptor) {
          const d = {
            id: dependency.id,
            desc: instanceOrDesc,
            _trace: item._trace.branch(dependency.id, true),
          };
          graph.insertEdge(item, d);
          stack.push(d);
        }
      }
    }

    while (true) {
      const leafs = graph.leafs();

      if (leafs.length === 0) {
        if (!graph.isEmpty()) {
          throw new CyclicDependencyError(graph);
        }
        break;
      }

      for (const { data } of leafs) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
        if (instanceOrDesc instanceof SyncDescriptor) {
          const instance = this._createServiceInstanceWithOwner(
            data.id,
            data.desc.ctor,
            data.desc.staticArguments,
            data.desc.supportsDelayedInstantiation,
            data._trace,
          );
          this._setCreatedServiceInstance(data.id, instance);
        }
        graph.removeNode(data);
      }
    }
    return this._getServiceInstanceOrDescriptor(id) as T;
  }

  private _createServiceInstanceWithOwner<T>(
    id: ServiceIdentifier<T>,
    ctor: any,
    args: any[] = [],
    supportsDelayedInstantiation: boolean,
    _trace: Trace,
  ): T {
    if (this._services.get(id) instanceof SyncDescriptor) {
      return this._createServiceInstance(
        id,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else if (this._parent) {
      return this._parent._createServiceInstanceWithOwner(
        id,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else {
      throw new Error(
        `illegalState - creating UNKNOWN service instance ${ctor.name}`,
      );
    }
  }

  private _createServiceInstance<T>(
    id: ServiceIdentifier<T>,
    ctor: any,
    args: any[] = [],
    supportsDelayedInstantiation: boolean,
    _trace: Trace,
  ): T {
    if (!supportsDelayedInstantiation) {
      const result = this._createInstance<T>(ctor, args, _trace);
      return result;
    }
    const child = new InstantiationService(
      undefined,
      this,
      this._enableTracing,
    );
    child._globalGraphImplicitDependency = String(id);

    const idle = new GlobalIdleValue<any>(() => {
      const result = child._createInstance<T>(ctor, args, _trace);
      return result;
    });

    return new Proxy(Object.create(null), {
      get(target: any, key: PropertyKey): any {
        if (key in target) {
          return target[key];
        }
        const obj = idle.value;
        let prop = obj[key];
        if (typeof prop !== 'function') {
          return prop;
        }
        prop = prop.bind(obj);
        target[key] = prop;
        return prop;
      },
      set(_target: T, p: PropertyKey, value: any): boolean {
        idle.value[p] = value;
        return true;
      },
      getPrototypeOf(_target: T) {
        return ctor.prototype;
      },
    }) as T;
  }
}
