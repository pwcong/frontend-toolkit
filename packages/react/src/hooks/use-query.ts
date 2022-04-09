import { useEffect, useMemo, useRef, useState } from 'react';

import { shallowEqual } from '../utils';

export type IBuildUseQueryOptions = {
  /** 查询名称 */
  name?: string;
  /** 转换方法 */
  transform?: {
    /** 编码方法 */
    encode: (query: any) => string;
    /** 解码方法 */
    decode: (str: string) => any;
  };
};

/**
 * 查询条件Hook工厂函数
 * @param options 查询条件Hook配置
 * @returns
 */
export function buildUseQuery(options?: IBuildUseQueryOptions) {
  const {
    name = 'query',
    transform = {
      encode: (query: any) => encodeURIComponent(JSON.stringify(query)),
      decode: (str: string) => JSON.parse(decodeURIComponent(str)),
    },
  } = options ?? {};

  /**
   * 查询条件Hook
   * @param defaultQuery 默认查询条件
   * @param getDept 监听依赖
   * @returns
   */
  function useQuery(defaultQuery?: any, getDept?: () => any) {
    const _defaultQuery = useMemo(() => {
      const search = new URLSearchParams(location.search);

      let existQuery = {};
      const value = search.get(name);
      if (value) {
        try {
          existQuery = transform.decode(value);
        } catch {
          // DO NOTHING
        }
      }

      return {
        ...defaultQuery,
        ...existQuery,
      };
    }, []);

    const [query, setQuery] = useState(_defaultQuery);
    const cacheQuery = useRef<any>();

    useEffect(() => {
      if (!getDept) {
        return;
      }

      const deptQuery = getDept() ?? {};

      // 浅比较对象
      if (shallowEqual(deptQuery, cacheQuery.current)) {
        return;
      }

      cacheQuery.current = deptQuery;

      // 过滤无效查询参数
      const newQuery = Object.keys(deptQuery).reduce((p, k) => {
        const v = deptQuery[k];
        switch (true) {
          case ['', null, undefined].includes(v):
            // 过滤空数据
            break;
          case typeof v === 'object' && Object.keys(v).length <= 0:
            // 过滤空对象
            break;
          default:
            p[k] = v;
            break;
        }

        return p;
      }, {} as Record<string, any>);

      const search = new URLSearchParams(location.search);

      if (Object.keys(newQuery).length <= 0) {
        search.delete(name);
      } else {
        search.set(name, transform.encode(newQuery));
      }

      history.replaceState(null, '', `?${search.toString()}`);
    });

    const ret = [query, setQuery] as const;

    return ret;
  }

  return useQuery;
}
