/**
 * 缓存类
 */
export class Cache<T = any> {
  private store: Record<string, T | undefined> = {};
  private times: Record<string, number | undefined> = {};

  /**
   *
   * @param key 唯一标识
   * @param value 缓存值
   * @param cacheTime 缓存时间（单位秒）
   */
  set(key: string, value: T, cacheTime?: number) {
    this.store[key] = value;
    this.times[key] =
      cacheTime !== undefined
        ? new Date().getTime() + cacheTime * 1000
        : undefined;
  }

  /**
   * 获取缓存值
   * @param key 唯一标识
   * @returns 
   */
  get(key: string) {
    const value = this.store[key];
    const expiredTime = this.times[key];

    if (expiredTime === undefined) {
      return value;
    }

    return new Date().getTime() > expiredTime ? undefined : value;
  }

  /**
   * 删除缓存值
   * @param key 唯一标识
   */
  del(key: string) {
    this.store[key] = undefined;
    this.times[key] = undefined;
  }
}
