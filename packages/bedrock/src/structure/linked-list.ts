class Node<T> {
  next: Node<T> | null;

  prev: Node<T> | null;

  constructor(public value: T) {
    this.next = null;
    this.prev = null;
  }
}

export class LinkedList<T> {
  protected _first: Node<T> | null = null;

  protected _last: Node<T> | null = null;

  protected _size: number = 0;

  public get size(): number {
    return this._size;
  }

  public get firstNode(): Node<T> | null {
    return this._first;
  }

  public get lastNode(): Node<T> | null {
    return this._last;
  }

  public isEmpty(): boolean {
    return this._first === null;
  }

  public clear(): void {
    let node = this._first;
    while (node !== null) {
      const { next } = node;
      node.prev = null;
      node.next = null;
      node = next;
    }

    this._first = null;
    this._last = null;
    this._size = 0;
  }

  public unshift(value: T): LinkedList<T> {
    const newNode = new Node(value);
    if (this._first === null) {
      this._first = newNode;
      this._last = newNode;
    } else {
      const temp = this._first;
      this._first = newNode;
      newNode.next = temp;
      temp.prev = newNode;
    }
    this._size++;
    return this;
  }

  public push(value: T): LinkedList<T> {
    const newNode = new Node(value);
    if (this._last === null) {
      this._first = newNode;
      this._last = newNode;
    } else {
      const temp = this._last;
      this._last = newNode;
      newNode.prev = temp;
      temp.next = newNode;
    }
    this._size++;
    return this;
  }

  public shift(): T | null {
    if (this._first === null) {
      return null;
    } else {
      const res = this._first.value;
      this._remove(this._first);
      return res;
    }
  }

  public pop(): T | null {
    if (this._last === null) {
      return null;
    } else {
      const res = this._last.value;
      this._remove(this._last);
      return res;
    }
  }

  public toArray(): T[] {
    const nodes: T[] = [];
    for (const node of this) {
      nodes.push(node);
    }
    return nodes;
  }

  public *[Symbol.iterator](): Iterator<T> {
    let node = this._first;
    while (node !== null) {
      yield node.value;
      node = node.next;
    }
  }

  protected _remove(node: Node<T>): void {
    if (node.prev !== null && node.next !== null) {
      // middle
      const temp = node.prev;
      temp.next = node.next;
      node.next.prev = temp;
    } else if (node.prev === null && node.next === null) {
      // only node
      this._first = null;
      this._last = null;
    } else if (node.next === null) {
      // last
      this._last = this._last!.prev!;
      this._last.next = null;
    } else if (node.prev === null) {
      // first
      this._first = this._first!.next!;
      this._first.prev = null;
    }

    this._size -= 1;
  }
}
