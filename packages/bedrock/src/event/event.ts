import { Emitter } from './emitter';
import { asyncUnexpectedErrorHandler } from './error-handler';

import { DisposableLinkedList, IDisposable } from '@/dispose';

export class Listener<TArgs extends any[]> {
  constructor(
    private readonly _callback: (...args: TArgs) => void,
    private readonly _callbackThis: any | undefined,
  ) {}

  invoke(...args: TArgs): void {
    this._callback.call(this._callbackThis, ...args);
  }
}

class EventDeliveryQueueElement<TArgs extends any[]> {
  constructor(
    public readonly emitter: Emitter<TArgs>,
    public readonly listener: Listener<TArgs>,
    public readonly event: TArgs,
  ) {}
}

export class EventDeliveryQueue<TArgs extends any[]> {
  protected _queue: DisposableLinkedList<EventDeliveryQueueElement<TArgs>> =
    new DisposableLinkedList<EventDeliveryQueueElement<TArgs>>();

  constructor(
    private readonly _onListenerError: (
      e: unknown,
    ) => void = asyncUnexpectedErrorHandler,
  ) {}

  get size(): number {
    return this._queue.size;
  }

  push(emitter: Emitter<TArgs>, listener: Listener<TArgs>, event: TArgs): void {
    this._queue.push(new EventDeliveryQueueElement(emitter, listener, event));
  }

  clear(emitter: Emitter<TArgs>): void {
    const newQueue = new DisposableLinkedList<
      EventDeliveryQueueElement<TArgs>
    >();
    for (const element of this._queue) {
      if (element.emitter !== emitter) {
        newQueue.push(element);
      }
    }
    this._queue = newQueue;
  }

  deliver(): void {
    while (this._queue.size > 0) {
      const element = this._queue.shift()!;
      try {
        element.listener.invoke(...element.event);
      } catch (e) {
        this._onListenerError(e);
      }
    }
  }
}

export type Event<T extends any[]> = (
  listener: (...args: T) => any,
  thisArgs?: any,
) => IDisposable;
