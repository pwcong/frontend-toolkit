import React from 'react';
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

export function buildUseFetch<T, P = Record<string, unknown>>(
  options: IBuildUseFetchOptions<T, P>
) {
  const {
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getQuery = query => query,
    getData = () => Promise.resolve(undefined),
  } = options;

  return function useFetch<C = Record<string, unknown>>(
    props: P,
    defaultQuery?: C
  ) {
    const [inited, setInited] = React.useState(false);
    const [loading, setLoading] = React.useState(immediate);

    const [data, setData] = React.useState<T>();

    const [query, setQuery] = React.useState({
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

    // 缓存变量
    const ref = React.useRef({
      props,
      inited,
      loading,
      query,
      data,
      isUnmounted: false,
    });

    // 数据请求方法
    const onFetch = React.useCallback(
      debounce(_query => {
        setTimeout(async () => {
          try {
            const newQuery = getQuery(
              {
                ..._query,
              },
              ref.current.props
            );

            const targetQuery = Object.keys(newQuery).reduce((p, c) => {
              const v = newQuery[c];
              if (v !== undefined && v !== null) {
                p[c] = v;
              }
              return p;
            }, {} as any);

            const _data = await getData(targetQuery, ref.current.props);

            setData(_data);
            ref.current.data = _data;
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
            ref.current.loading = false;
          }
        });
      }, duration),
      []
    );

    // 数据加载方法
    const onLoad = React.useCallback(_query => {
      setLoading(true);
      ref.current.loading = true;

      onFetch(_query);
    }, []);

    // 数据刷新方法
    const onRefresh = React.useCallback(() => {
      onLoad(ref.current.query);
    }, []);

    // 组件更新时监测查询参数变更，若变更自动执行数据加载方法
    React.useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.query = query;
      onRefresh();
    }, [query]);

    // 组件更新时监测组件Props参数变更（通过关联属性过滤），若变更自动执行数据加载方法
    React.useEffect(() => {
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
    React.useEffect(() => {
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
      data,
    };

    const fetchAction = {
      setInited,
      setLoading,
      setQuery,
      setData,
      onLoad,
      onRefresh,
    };

    const ret: [typeof fetchResult, typeof fetchAction] = [
      fetchResult,
      fetchAction,
    ];

    return ret;
  };
}
