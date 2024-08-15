import {
  IBaseUndoRedoItem,
  UndoRedoItemOperateType,
  UndoRedoType,
} from './interface';

export interface IBaseUndoRedoItemOptions<T> {
  redoCommand: T;
  undoCommand: T;
  executeCommand: (command: T, type: UndoRedoType) => void;
  canUndoRedo?: boolean;
  operateType: UndoRedoItemOperateType;
}

export class BaseUndoRedoItem<T> implements IBaseUndoRedoItem<T> {
  redoCommand: T;

  undoCommand: T;

  canUndoRedo: boolean;

  operateType: UndoRedoItemOperateType;

  protected executeCommand: IBaseUndoRedoItemOptions<T>['executeCommand'];

  constructor(options: IBaseUndoRedoItemOptions<T>) {
    this.redoCommand = options.redoCommand;
    this.undoCommand = options.undoCommand;
    this.canUndoRedo = options.canUndoRedo !== false;
    this.operateType = options.operateType;
    this.executeCommand = options.executeCommand;
  }

  reverse(): IBaseUndoRedoItem<T> {
    const { undoCommand, redoCommand, operateType } = this;

    return new BaseUndoRedoItem({
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
