import {
  IBaseUndoRedoItem,
  UndoRedoItemOperateType,
  UndoRedoType,
} from './interface';

export interface IUndoRedoItemOptions<T> {
  redoCommand: T;
  undoCommand: T;
  executeCommand: (command: T, type: UndoRedoType) => void;
  canUndoRedo?: boolean;
  operateType: UndoRedoItemOperateType;
}

export class UndoRedoItem<T> implements IBaseUndoRedoItem<T> {
  redoCommand: T;

  undoCommand: T;

  canUndoRedo: boolean;

  operateType: UndoRedoItemOperateType;

  protected executeCommand: IUndoRedoItemOptions<T>['executeCommand'];

  constructor(options: IUndoRedoItemOptions<T>) {
    this.redoCommand = options.redoCommand;
    this.undoCommand = options.undoCommand;
    this.canUndoRedo = options.canUndoRedo !== false;
    this.operateType = options.operateType;
    this.executeCommand = options.executeCommand;
  }

  reverse(): IBaseUndoRedoItem<T> {
    const { undoCommand, redoCommand, operateType } = this;

    return new UndoRedoItem({
      undoCommand: redoCommand,
      redoCommand: undoCommand,
      executeCommand: this.executeCommand,
      operateType,
    });
  }

  execute(type: UndoRedoType): void {
    this.executeCommand(this.undoCommand, type);
  }
}
