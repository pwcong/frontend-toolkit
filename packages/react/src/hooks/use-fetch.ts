import { useState, useRef, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';

export interface IBuildUseFetchOptions<T, P> {
  /** 是否立即查询，默认值为true */
  immediate?: boolean;
  /** 防抖间隔（毫秒），默认值为300 */
  duration?: number;
  /** 关联属性，默认值为空数组 */
  relation?: Array<string>;
  /** 筛选条件，默认值为空数组 */
  properties?: Array<string | { key: string; value: any }>;
  /** 筛选条件转换钩子函数 */
  getQuery?: (query: any, props: P) => any;
  /** 加载数据钩子函数 */
  getData?: (query: any, props: P) => Promise<T>;
}

/**
 * 数据请求Hook工厂函数
 * @param options 数据请求Hook配置
 * @returns
 */
export function buildUseFetch<T, P = {}>(options: IBuildUseFetchOptions<T, P>) {
  const {
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getQuery = query => query,
    getData = () => Promise.resolve(undefined),
  } = options;

  /**
   * 数据请求Hook
   * @param props 组件Props
   * @param defaultQuery 默认查询条件
   * @returns
   */
  function useFetch<C = {}>(props: P, defaultQuery?: C) {
    const [inited, setInited] = useState(false);
    const [loading, setLoading] = useState(immediate);

    const [data, setData] = useState<T>();

    const [query, setQuery] = useState({
      ...properties.reduce((p, c) => {
        if (typeof c === 'object') {
          p[c.key] = c.value;
        } else {
          p[c] = undefined;
        }
        return p;
      }, {} as any),
      ...(defaultQuery || {}),
    });
    const [targetQuery, setTargetQuery] = useState(query);

    // 缓存变量
    const ref = useRef({
      props,
      inited,
      loading,
      query,
      targetQuery,
      data,
      isUnmounted: false,
    });

    // 请求队列
    const queue = useRef({
      size: 0,
      next: Promise.resolve(),
    });

    // 数据请求方法
    const onFetch = useCallback(
      debounce(_query => {
        const run = async () => {
          try {
            const _data = await getData(_query, ref.current.props);

            ref.current.data = _data;
            !ref.current.isUnmounted && setData(_data);
          } catch (e) {
            console.error(e);
          } finally {
            queue.current.size--;
            ref.current.loading = false;
            !ref.current.isUnmounted &&
              queue.current.size <= 0 &&
              setLoading(false);
          }
        };

        queue.current.size++;
        queue.current.next = queue.current.next.then(run);
      }, duration),
      []
    );

    // 数据加载方法
    const onLoad = useCallback(_query => {
      ref.current.loading = true;
      setLoading(true);

      // 通过筛选条件转换钩子函数获取转换后的请求条件
      const newQuery = getQuery(
        {
          ..._query,
        },
        ref.current.props
      );

      ref.current.targetQuery = newQuery;
      setTargetQuery(newQuery);

      onFetch(newQuery);
    }, []);

    // 数据刷新方法
    const onRefresh = useCallback(() => {
      onLoad(ref.current.query);
    }, []);

    // 组件更新时监测查询参数变更，若变更自动执行数据加载方法
    useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.query = query;
      onRefresh();
    }, [query]);

    // 组件更新时监测组件Props参数变更（通过关联属性过滤），若变更自动执行数据加载方法
    useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      const oldProps = ref.current.props;
      ref.current.props = props;
      if (relation.find(p => (oldProps as any)[p] !== (props as any)[p])) {
        onRefresh();
      }
    }, [props]);

    // 组件初始化时判断是否自动执行数据加载方法
    useEffect(() => {
      setInited(true);
      ref.current.inited = true;

      if (immediate) {
        onLoad(ref.current.query);
      }

      return () => {
        ref.current.isUnmounted = true;
      };
    }, []);

    const fetchResult = {
      inited,
      loading,
      query,
      targetQuery,
      data,
    };

    const fetchAction = {
      setInited,
      setLoading,
      setQuery,
      setTargetQuery,
      setData,
      onLoad,
      onRefresh,
    };

    const ret = [fetchResult, fetchAction] as const;

    return ret;
  }

  return useFetch;
}
