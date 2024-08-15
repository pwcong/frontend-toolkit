/**
 * 针对未捕获的错误，异步抛出，不阻塞事件响应主流程
 * 默认模式
 */
export function asyncUnexpectedErrorHandler(error: any): void {
  setTimeout(() => {
    throw error;
  }, 0);
}

/**
 * 针对未捕获的错误，同步抛出，阻塞事件响应主流程
 */
export function syncUnexpectedError(error: any): void {
  throw error;
}

/**
 * 针对未捕获的错误，静默掉，不进行处理
 */
export function ignoreUnexpectedError(_error: any): void {
  // DO NOTHING
}
