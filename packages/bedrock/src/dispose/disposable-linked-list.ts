import { LinkedList } from '@/structure';

export class DisposableLinkedList<T> extends LinkedList<T> {
  unshiftAndGetDisposableNode(value: T): () => void {
    const node = this.unshift(value).firstNode!;
    let hasRemoved = false;
    return (): void => {
      if (!hasRemoved) {
        hasRemoved = true;
        super._remove(node);
      }
    };
  }

  pushAndGetDisposableNode(value: T): () => void {
    const node = this.push(value).lastNode!;
    let hasRemoved = false;
    return (): void => {
      if (!hasRemoved) {
        hasRemoved = true;
        super._remove(node);
      }
    };
  }
}
