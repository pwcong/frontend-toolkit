import { BaseUndoRedoItem } from './undo-redo-item';
import { UndoRedoType } from './interface';

export class BaseUndoRedoStack<
  T,
  P extends BaseUndoRedoItem<T> = BaseUndoRedoItem<T>,
> {
  undoStack: P[] = [];

  redoStack: P[] = [];

  protected maxStackSize: number = Infinity;

  hasUndoRedoItem(): boolean {
    return Boolean(this.undoStack.find(item => item.canUndoRedo));
  }

  canUndo(): boolean {
    return Boolean(this.hasUndoRedoItem());
  }

  canRedo(): boolean {
    return Boolean(this.redoStack.length);
  }

  undo(): P[] {
    if (!this.canUndo()) {
      return [];
    }
    const undoItem = this._getUndoItem() as P;
    const redoItem = undoItem.reverse() as P;
    this.redoStack.unshift(redoItem);

    undoItem.execute(UndoRedoType.Undo);

    return [undoItem];
  }

  redo(): P[] {
    if (!this.canRedo()) {
      return [];
    }
    const redoItem = this.redoStack.shift()!;

    const undoItem = redoItem.reverse() as P;
    this.undoStack.unshift(undoItem);
    redoItem.execute(UndoRedoType.Redo);

    return [redoItem];
  }

  push(item: P, clearRedoStack = true): void {
    if (clearRedoStack) {
      this.clearRedoStack();
    }

    this.undoStack.unshift(item);

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.pop();
    }
  }

  setMaxStackSize(size: number): void {
    if (size <= 0) {
      return;
    }

    this.maxStackSize = size;
  }

  getTopItem(): BaseUndoRedoItem<T> | undefined {
    return this.undoStack[0];
  }

  destroy(): void {
    this.reset();
  }

  reset(): void {
    this.clearUndoStack();
    this.clearRedoStack();
  }

  protected clearUndoStack(): void {
    this.undoStack.length = 0;
  }

  protected clearRedoStack(): void {
    this.redoStack.length = 0;
  }

  private _getUndoItem(): P | undefined {
    let undoItem;
    for (let i = 0; i < this.undoStack.length; i++) {
      if (this.undoStack[i].canUndoRedo) {
        undoItem = this.undoStack[i];
        this.undoStack.splice(i, 1);
        return undoItem;
      }
    }
    return undefined;
  }
}
