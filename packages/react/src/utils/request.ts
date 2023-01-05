import { AxiosResponse } from 'axios';

type IError = ReturnType<typeof Error> & { response: AxiosResponse };

type IErrorMsg = string;

export type IWrapResponseOptions = {
  /** 成功标识字段 */
  successKey?: string;
  /** 成功标识值 */
  successValue?: number;
  /** 提示信息字段 */
  messageKey?: string;
  /** 默认错误提示 */
  defaultErrorMsg?: IErrorMsg;
  /** 自定义错误校验 */
  validator?: (response: AxiosResponse) => boolean | IErrorMsg;
  /** 错误处理钩子函数 */
  onError?: (error: IError) => void;
};

/**
 * 自定义错误容器
 * @param response 请求响应
 * @param message 提示信息
 * @returns
 */
const wrapError = (response: AxiosResponse, message?: IErrorMsg) => {
  const error = new Error(message);
  const wrappedError = error as IError;
  wrappedError.response = response;
  return wrappedError;
};

/**
 * 包装响应拦截器
 * @param options 包装配置
 * @returns
 */
export function buildWrapResponseInterceptor<T = any, D = any>(
  options: IWrapResponseOptions
) {
  const {
    successKey,
    successValue,
    messageKey,
    defaultErrorMsg,
    validator,
    onError,
  } = options;

  const onFulfilled = (response: AxiosResponse<T, D>) => {
    // 优先级进行自定义错误校验
    if (validator !== undefined) {
      const result = validator(response);
      if (result !== true) {
        const wrappedError = wrapError(response, result || defaultErrorMsg);

        onError?.(wrappedError);
        throw wrappedError;
      }
    }

    // 其次进行错误标识校验
    if (
      successKey !== undefined &&
      successValue !== undefined &&
      messageKey !== undefined
    ) {
      const data: any = response.data;
      if (data[successKey] !== successValue) {
        const message = data[messageKey];
        const wrappedError = wrapError(response, message ?? defaultErrorMsg);

        onError?.(wrappedError);
        throw wrappedError;
      }
    }

    return response;
  };

  const onRejected = (error: any) => {
    onError?.(error);
    return Promise.reject(error);
  };

  return [onFulfilled, onRejected] as const;
}

export type IBatchRequestOptions = {
  /** 批量限制 */
  thread?: number;
  /** 进度回调 */
  onProgress?: (current: number, total: number) => void;
};

/**
 * 批量请求
 * @param requests 请求列表
 * @param options
 */
export async function batchRequest<T = any>(
  requests: Array<() => Promise<T>>,
  options?: IBatchRequestOptions
) {
  const { thread = 5, onProgress } = options ?? {};

  const queue = [...requests];
  let current = 0;
  const total = queue.length;

  const result: PromiseSettledResult<T>[] = [];

  while (queue.length > 0) {
    onProgress?.(current * thread + 1, total);
    current++;
    const reqs = queue.splice(0, thread).map(req => req());
    const resp = await Promise.allSettled(reqs);
    result.push(...resp);
  }

  return result;
}
