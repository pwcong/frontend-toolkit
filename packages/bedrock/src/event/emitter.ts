import { asyncUnexpectedErrorHandler } from './error-handler';
import { Event, EventDeliveryQueue, Listener } from './event';
import {
  DisposableLinkedList,
  IDisposable,
  makeSafeDisposable,
} from '@/dispose';

export interface EmitterOptions {
  onAddListener?: (...args: any) => any;
  onRemoveListener?: (...args: any) => any;
  onListenerError?: (e: any) => void;
}

export class Emitter<TArgs extends any[]> {
  protected _listeners?: DisposableLinkedList<Listener<TArgs>>;

  private readonly _options?: EmitterOptions;

  private _disposed: boolean = false;

  private _event?: Event<TArgs>;

  private _deliveryQueue?: EventDeliveryQueue<TArgs>;

  constructor(options?: EmitterOptions) {
    this._options = options;
  }

  get event(): Event<TArgs> {
    if (this._event) {
      return this._event;
    }

    this._event = (
      callback: (...args: TArgs) => any,
      thisArgs?: any,
    ): IDisposable => {
      const listener = new Listener(callback, thisArgs);

      if (!this._listeners) {
        this._listeners = new DisposableLinkedList();
      }

      const removeListener = this._listeners.pushAndGetDisposableNode(listener);

      if (this._options?.onAddListener) {
        this._options.onAddListener(this, callback, thisArgs);
      }

      const result = () => {
        if (!this._disposed) {
          removeListener();
          if (this._options?.onRemoveListener) {
            this._options.onRemoveListener(this, callback, thisArgs);
          }
        }
      };

      return makeSafeDisposable(result);
    };

    return this._event;
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._listeners?.clear();
    this._deliveryQueue?.clear(this);
  }

  fire(...event: TArgs): void {
    if (!this._listeners || this._listeners.size === 0) {
      return;
    }
    if (this._listeners.size === 1) {
      const listener = this._listeners.firstNode!;
      try {
        listener.value.invoke(...event);
      } catch (e) {
        (this._options?.onListenerError ?? asyncUnexpectedErrorHandler)(e);
      }
      return;
    }

    this._deliveryQueue ??= new EventDeliveryQueue(
      this._options?.onListenerError,
    );

    for (const listener of this._listeners) {
      this._deliveryQueue.push(this, listener, event);
    }
    this._deliveryQueue.deliver();
  }
}
