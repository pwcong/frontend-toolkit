import React from 'react';
import { debounce, omit } from 'lodash';

export enum EListPlatform {
  'Desktop' = 'Desktop',
  'Mobile' = 'Mobile',
}

export interface IUseListData<T> {
  totalSize: number;
  data: Array<T>;
}

export type IUseListQuery = {
  // 分页页码
  pageNo: number;
  // 分页大小
  pageSize: number;
};

export interface IBuildUseListOptions<T, P> {
  platform?: EListPlatform;
  immediate?: boolean;
  duration?: number;
  relation?: Array<string>;
  properties?: Array<string | { key: string; value: any }>;
  getQuery?: (query: any, props: P) => any;
  getData?: (query: any, props: P) => Promise<IUseListData<T>>;
}

export function buildUseList<T, P = Record<string, unknown>>(
  options: IBuildUseListOptions<T, P>
) {
  const {
    // platform = EListPlatform.Desktop,
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getQuery = query => query,
    getData = () => Promise.resolve({ data: [], totalSize: 0 }),
  } = options;

  return function useList<C = Record<string, unknown>>(
    props: P,
    _defaultQuery?: C & Partial<IUseListQuery>
  ) {
    const [inited, setInited] = React.useState(false);
    const [loading, setLoading] = React.useState(immediate);
    const [loadingMore, setLoadingMore] = React.useState(false);

    const [list, setList] = React.useState<Array<T>>([]);

    const defaultQuery = React.useMemo(
      () => ({
        pageNo: 1,
        pageSize: 10,
        ..._defaultQuery,
      }),
      []
    );
    const [pageNo, setPageNo] = React.useState(defaultQuery.pageNo);
    const [pageSize, setPageSize] = React.useState(defaultQuery.pageSize);

    const [query, setQuery] = React.useState({
      ...properties.reduce((p, c) => {
        if (typeof c === 'object') {
          p[c.key] = c.value;
        } else {
          p[c] = undefined;
        }
        return p;
      }, {} as any),
      ...omit(defaultQuery, ['pageNo', 'pageSize']),
    });

    const [totalSize, setTotalSize] = React.useState(0);
    // 判断是否有下一页
    const hasMore = React.useMemo(
      () => pageSize * pageNo < totalSize && list.length < totalSize,
      [pageSize, pageNo, list, totalSize]
    );

    const ref = React.useRef({
      props,
      pageNo,
      pageSize,
      totalSize,
      inited,
      loading,
      loadingMore,
      query,
      list,
      isUnmounted: false,
    });

    const onLoad = React.useCallback(
      debounce(_query => {
        setLoading(true);
        ref.current.loading = true;

        setTimeout(async () => {
          try {
            const newQuery = getQuery(
              {
                pageNo: ref.current.pageNo,
                pageSize: ref.current.pageSize,
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

            const { data = [], totalSize: _totalSize = 0 } = await getData(
              targetQuery,
              ref.current.props
            );

            setTotalSize(_totalSize);
            ref.current.totalSize = _totalSize;

            let _list: Array<T> = [];
            if (ref.current.loadingMore) {
              _list = ref.current.list.concat(data);
            } else {
              _list = data;
            }
            setList(_list);
            ref.current.list = _list;
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
            ref.current.loading = false;
            setLoadingMore(false);
            ref.current.loadingMore = false;
          }
        });
      }, duration),
      [ref]
    );

    const onRefresh = React.useCallback(
      debounce((reload?: boolean) => {
        if (ref.current.loading) {
          return;
        }

        const _reload = reload === undefined ? true : reload;
        if (_reload) {
          setPageNo(1);
          ref.current.pageNo = 1;
        }

        onLoad(ref.current.query);
      }, duration),
      [ref, onLoad]
    );

    const onLoadMore = React.useCallback(
      debounce(() => {
        if (ref.current.loading) {
          return;
        }

        setLoadingMore(true);
        ref.current.loadingMore = true;

        setPageNo(ref.current.pageNo + 1);
        ref.current.pageNo++;
      }, duration),
      []
    );

    React.useEffect(() => {
      ref.current.pageNo = pageNo;
      if (ref.current.inited) {
        onLoad(ref.current.query);
      }
    }, [ref, pageNo, onload]);

    React.useEffect(() => {
      ref.current.pageSize = pageSize;
      if (ref.current.inited) {
        onRefresh(true);
      }
    }, [ref, pageSize, onRefresh]);

    React.useEffect(() => {
      ref.current.query = query;
      if (ref.current.inited) {
        onRefresh(true);
      }
    }, [ref, query, onRefresh]);

    React.useEffect(() => {
      const oldProps = ref.current.props;
      ref.current.props = props;
      if (ref.current.inited) {
        relation.forEach(p => {
          if ((oldProps as any)[p] !== (props as any)[p]) {
            onRefresh(true);
          }
        });
      }
    }, [ref, props]);

    React.useEffect(() => {
      setInited(true);
      ref.current.inited = true;

      if (immediate) {
        onLoad(ref.current.query);
      }

      return () => {
        ref.current.isUnmounted = true;
      };
    }, [ref]);

    return [
      {
        inited,
        loading,
        loadingMore,
        pageNo,
        pageSize,
        totalSize,
        hasMore,
        query,
        list,
      },
      {
        setInited,
        setLoading,
        setLoadingMore,
        setPageNo,
        setPageSize,
        setTotalSize,
        setQuery,
        setList,
        onLoad,
        onRefresh,
        onLoadMore,
      },
    ];
  };
}
