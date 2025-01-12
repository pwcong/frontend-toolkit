import { ServiceIdentifier } from './base';
import { SyncDescriptor } from './descriptor';

export class ServiceCollection {
  private _entries: Map<ServiceIdentifier<any>, any> = new Map();

  constructor(...entries: [ServiceIdentifier<any>, any][]) {
    for (const [id, service] of entries) {
      this.set(id, service);
    }
  }

  get entries() {
    return this._entries;
  }

  set<T>(
    id: ServiceIdentifier<T>,
    instanceOrDescriptor: T | SyncDescriptor<T>,
  ): T | SyncDescriptor<T> {
    const result = this._entries.get(id);
    this._entries.set(id, instanceOrDescriptor);
    return result;
  }

  has(id: ServiceIdentifier<any>): boolean {
    return this._entries.has(id);
  }

  get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
    return this._entries.get(id);
  }
}
