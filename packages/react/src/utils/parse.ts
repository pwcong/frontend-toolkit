/**
 * JSON反序列化
 * @param json JSON字符串
 * @param defaultValue 默认值
 * @returns
 */
export function parseJSON<T = any>(json: string, defaultValue: T) {
  let target: T;
  try {
    target = JSON.parse(json);
  } catch {
    target = defaultValue;
  }

  return target;
}
