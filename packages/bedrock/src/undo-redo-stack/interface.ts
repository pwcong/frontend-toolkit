export enum UndoRedoItemOperateType {
  Local = 'local',
  Collab = 'collab',
}

export interface IBaseUndoRedoItem<T> {
  redoCommand: T;

  undoCommand: T;

  reverse: () => IBaseUndoRedoItem<T>;

  execute: (type: UndoRedoType) => void;

  canUndoRedo: boolean;

  operateType: UndoRedoItemOperateType;
}

export enum UndoRedoType {
  Undo = 'undo',
  Redo = 'redo',
}
