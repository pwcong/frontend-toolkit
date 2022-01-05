import React from 'react';
import { debounce } from 'lodash';

export interface IBuildUseFetchOptions<T, P> {
  immediate?: boolean;
  duration?: number;
  relation?: Array<string>;
  properties?: Array<string | { key: string; value: any }>;
  getQuery?: (query: any, props: P) => any;
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

    const ref = React.useRef({
      props,
      inited,
      loading,
      query,
      data,
      isUnmounted: false,
    });

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

    const onLoad = React.useCallback(_query => {
      setLoading(true);
      ref.current.loading = true;

      onFetch(_query);
    }, []);

    const onRefresh = React.useCallback(() => {
      onLoad(ref.current.query);
    }, []);

    React.useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.query = query;
      onRefresh();
    }, [query]);

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

    return [
      {
        inited,
        loading,
        query,
        data,
      },
      {
        setInited,
        setLoading,
        setQuery,
        setData,
        onLoad,
        onRefresh,
      },
    ];
  };
}
