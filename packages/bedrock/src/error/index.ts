export type IErrorRef<K = unknown> = IErrorOr<never, K>;

export interface IRealErrorRef<K = unknown> {
  readonly ok: false;
  readonly code: number;
  readonly msg: string;
  readonly cause?: IErrorRef | Error;
  readonly toString: () => string;
  readonly pair: () => [IRealErrorRef<K>, null];
  readonly errorInfo?: K;
  readonly stack?: string;
}

export interface IValueRef<T> {
  readonly ok: true;
  readonly code: 0;
  readonly msg: '';
  readonly cause?: undefined;
  readonly value: T;
  readonly toString: () => string;
  readonly pair: () => [null, T];
}

export type IErrorOr<T, K = unknown> = (IRealErrorRef<K> | IValueRef<T>) & {
  readonly pair: () => [null, T] | [IRealErrorRef<K>, null];
};

const errorRefSymbol = Symbol('errorRef');

export function makeOk(): IErrorOr<never> {
  return {
    ok: true,
    value: null!,
    pair() {
      return [null, null!];
    },
    code: 0,
    msg: '',
    ...{ [errorRefSymbol]: true },
  };
}

export function makeOkWith<T, K = unknown>(value: T): IErrorOr<T, K> {
  return {
    ok: true,
    value,
    pair() {
      return [null, value];
    },
    code: 0,
    msg: '',
    ...{ [errorRefSymbol]: true },
  };
}

function printCause(cause: IErrorRef | Error | undefined): string {
  if (cause === undefined) {
    return '';
  } else if (cause instanceof Error) {
    return `\ncaused by [js_error]${cause.name}-${cause.message}`;
  } else {
    return `\ncaused by [${cause.code}]${cause.msg}${
      cause.ok ? '' : printCause(cause.cause)
    }`;
  }
}

function internalMakeError<T>(
  code: number,
  msg: string,
  cause?: IErrorRef | Error,
  errorInfo?: T,
) {
  const errorRef: IRealErrorRef<T> = {
    ok: false,
    code,
    msg,
    cause,
    errorInfo,
    toString() {
      return `[${code}]${msg}.${cause ? printCause(cause) : ''}`;
    },
    pair() {
      return [errorRef, null];
    },
    stack: cause instanceof Error ? cause.stack : '',
    ...{ [errorRefSymbol]: true },
  };
  return errorRef;
}

export function makeError<T = unknown>(
  code: number,
  msg: string,
  errorInfo?: T,
): IRealErrorRef<T> {
  return internalMakeError(code, msg, undefined, errorInfo);
}

export function makeErrorBy<T = unknown>(
  code: number,
  msg: string,
  cause: IErrorRef | Error,
  errorInfo?: T,
): IRealErrorRef<T> {
  return internalMakeError(code, msg, cause, errorInfo);
}

export function isErrorRef(val: unknown): val is IErrorRef {
  return typeof val === 'object' && val !== null && errorRefSymbol in val;
}
