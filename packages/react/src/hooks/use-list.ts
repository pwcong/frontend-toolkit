import React from 'react';
import { debounce, omit } from 'lodash';

/** 平台标识 */
export enum EListPlatform {
  /** 桌面端 */
  'Desktop' = 'Desktop',
  /** 移动端 */
  'Mobile' = 'Mobile',
}

export type IUseListData<T> = Record<string, unknown> & {
  /** 数据 */
  data: Array<T>;
  /** 数据总量 */
  totalSize: number;
};

export type IUseListQuery = {
  /** 分页页码 */
  pageNo: number;
  /** 分页大小 */
  pageSize: number;
};

export interface IBuildUseListOptions<T, P> {
  /** 平台标识，默认值为Desktop */
  platform?: EListPlatform;
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
  getData?: (query: any, props: P) => Promise<IUseListData<T>>;
  /** 自定义错误逻辑 */
  onError?: (err: any) => void;
}

/**
 * 列表请求Hook工厂函数
 * @param options 列表请求Hook配置
 * @returns
 */
export function buildUseList<T, P = {}>(options: IBuildUseListOptions<T, P>) {
  const {
    // platform = EListPlatform.Desktop,
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getQuery = query => query,
    getData = () => Promise.resolve({ data: [], totalSize: 0 }),
    onError = err => console.error(err),
  } = options;

  return function useList<C = {}>(
    props: P,
    _defaultQuery?: C & Partial<IUseListQuery>
  ) {
    const [inited, setInited] = React.useState(false);
    const [loading, setLoading] = React.useState(immediate);
    const [loadingMore, setLoadingMore] = React.useState(false);

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
    const [totalSize, setTotalSize] = React.useState(0);

    const [list, setList] = React.useState<Array<T>>([]);
    const [data, setData] = React.useState<IUseListData<T>>({
      data: list,
      totalSize: totalSize,
    });

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

    // 是否允许加载更多
    const hasMore = React.useMemo(
      () => pageSize * pageNo < totalSize && list.length < totalSize,
      [pageSize, pageNo, list, totalSize]
    );

    // 缓存变量
    const ref = React.useRef({
      props,
      pageNo,
      pageSize,
      totalSize,
      inited,
      loading,
      loadingMore,
      query,
      data,
      list,
      isUnmounted: false,
    });

    // 加载中状态变更方法
    const changeLoading = React.useCallback(
      (active?: boolean, more?: boolean) => {
        if (active) {
          setLoading(true);
          ref.current.loading = true;
          if (more) {
            setLoadingMore(true);
            ref.current.loadingMore = true;
          }
        } else {
          setLoading(false);
          ref.current.loading = false;
          setLoadingMore(false);
          ref.current.loadingMore = false;
        }
      },
      []
    );

    // 数据请求方法
    const onFetch = React.useCallback(
      debounce(_query => {
        setTimeout(async () => {
          try {
            // 通过筛选条件转换钩子函数获取转换后的请求条件
            const newQuery = getQuery(
              {
                pageNo: ref.current.pageNo,
                pageSize: ref.current.pageSize,
                ..._query,
              },
              ref.current.props
            );

            // 过滤值为undefined或null的请求条件
            const targetQuery = Object.keys(newQuery).reduce((p, c) => {
              const v = newQuery[c];
              if (v !== undefined && v !== null) {
                p[c] = v;
              }
              return p;
            }, {} as any);

            const result = await getData(targetQuery, ref.current.props);

            !ref.current.isUnmounted && setData(result);
            ref.current.data = result;

            const { data = [], totalSize: _totalSize = 0 } = result;

            !ref.current.isUnmounted && setTotalSize(_totalSize);
            ref.current.totalSize = _totalSize;

            let _list: Array<T> = [];
            if (ref.current.loadingMore) {
              _list = ref.current.list.concat(data);
            } else {
              _list = data;
            }
            !ref.current.isUnmounted && setList(_list);
            ref.current.list = _list;
          } catch (err) {
            onError(err);
          } finally {
            !ref.current.isUnmounted && changeLoading(false);
          }
        });
      }, duration),
      []
    );

    // 数据加载方法
    const onLoad = React.useCallback(
      (_query, _options?: { more?: boolean }) => {
        changeLoading(true, _options?.more);
        onFetch(_query);
      },
      []
    );

    // 数据刷新方法
    const onRefresh = React.useCallback((reload?: boolean) => {
      const _reload = reload === undefined ? true : reload;
      if (_reload) {
        setPageNo(1);
        ref.current.pageNo = 1;
      }

      onLoad(ref.current.query);
    }, []);

    // 数据加载更多方法
    const onLoadMore = React.useCallback(
      debounce(() => {
        changeLoading(true, true);

        setPageNo(ref.current.pageNo + 1);
        ref.current.pageNo++;
      }, duration),
      []
    );

    // 组件更新时监测页码变更，若变更自动执行数据加载方法
    React.useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.pageNo = pageNo;
      onLoad(ref.current.query);
    }, [pageNo]);

    // 组件更新时监测页数和查询参数变更，若变更自动执行数据加载方法
    React.useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.pageSize = pageSize;
      ref.current.query = query;
      onRefresh(true);
    }, [pageSize, query]);

    // 组件更新时监测组件Props参数变更（通过关联属性过滤），若变更自动执行数据加载方法
    React.useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      const oldProps = ref.current.props;
      ref.current.props = props;
      if (relation.find(p => (oldProps as any)[p] !== (props as any)[p])) {
        onRefresh(true);
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

    const listResult = {
      inited,
      loading,
      loadingMore,
      pageNo,
      pageSize,
      totalSize,
      hasMore,
      query,
      list,
      data,
    };
    const listAction = {
      setInited,
      setLoading,
      setLoadingMore,
      setPageNo,
      setPageSize,
      setTotalSize,
      setQuery,
      setList,
      setData,
      onLoad,
      onRefresh,
      onLoadMore,
    };

    const ret: [typeof listResult, typeof listAction] = [
      listResult,
      listAction,
    ];

    return ret;
  };
}
