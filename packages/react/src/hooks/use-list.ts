import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

import omit from 'omit.js';
import { debounce } from 'throttle-debounce';

import { useQueue, useUnique } from './use-queue';
import { useUnmounted } from './use-unmounted';

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
  totalSize?: number;
  /** 是否更多 */
  hasMore?: boolean;
};

export type IUseListQuery = {
  /** 分页页码 */
  pageNo: number;
  /** 分页大小 */
  pageSize: number;
};

export type IUseListQueueType =
  /** 所有请求依次异步执行完 */
  | 'queue'
  /** 只会处理最后一个请求，当有新请求的时候，上一个请求若未异步执行完，会忽略上一个请求 */
  | 'unique';

export interface IBuildUseListOptions<T, P> {
  /** 平台标识，默认值为Desktop */
  platform?: EListPlatform;
  /** 是否立即查询，默认值为true */
  immediate?: boolean;
  /** 防抖间隔（毫秒），默认值为300 */
  duration?: number;
  /** 依赖属性 */
  deps?: Array<string>;
  /** [Deprecated] 关联属性，默认值为空数组 */
  relation?: Array<string>;
  /** 筛选条件，默认值为空数组 */
  properties?: Array<string | { key: string; value: any }>;
  /** 筛选条件转换钩子函数 */
  getQuery?: (query: any, props: P) => any;
  /** 加载数据钩子函数 */
  getData?: (query: any, props: P) => Promise<IUseListData<T>>;
  /** 加载数据的队列类型，默认值为queue */
  queueType?: IUseListQueueType;
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
    relation: _deps = [],
    properties = [],
    getQuery = query => query,
    getData = () => Promise.resolve({ data: [], totalSize: 0, hasMore: false }),
    queueType = 'queue',
  } = options;

  const deps = options.deps ?? _deps;

  /**
   * 列表请求Hook
   * @param props 组件Props
   * @param _defaultQuery 默认查询条件
   * @returns
   */
  function useList<C = {}>(
    props: P,
    _defaultQuery?: C & Partial<IUseListQuery>
  ) {
    const [inited, setInited] = useState(false);
    const [loading, setLoading] = useState(immediate);
    const [loadingMore, setLoadingMore] = useState(false);

    const defaultQuery = useMemo(
      () => ({
        pageNo: 1,
        pageSize: 10,
        ..._defaultQuery,
      }),
      []
    );
    const [pageNo, setPageNo] = useState(defaultQuery.pageNo);
    const [pageSize, setPageSize] = useState(defaultQuery.pageSize);
    const [totalSize, setTotalSize] = useState(0);

    const [list, setList] = useState<Array<T>>([]);
    const [data, setData] = useState<IUseListData<T>>({
      data: list,
      totalSize: totalSize,
    });

    const [query, setQuery] = useState({
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
    const [targetQuery, setTargetQuery] = useState(query);

    // 是否允许加载更多
    const [hasMore, setHasMore] = useState(false);

    // 错误信息
    const [error, setError] = useState<any>();

    // 缓存变量
    const ref = useRef({
      props,
      pageNo,
      pageSize,
      totalSize,
      loading,
      loadingMore,
      hasMore,
      query,
      targetQuery,
      data,
      list,
      inited,
      error,
    });

    // 挂载状态
    const [, runWithoutUnmounted] = useUnmounted();

    // 请求队列
    const [, runWithQueue] = useQueue();
    const runWithUnique = useUnique();

    // 加载中状态变更方法
    const changeLoading = useCallback((active?: boolean, more?: boolean) => {
      if (active) {
        ref.current.loading = true;
        setLoading(true);
        if (more) {
          setLoadingMore(true);
          ref.current.loadingMore = true;
        }
      } else {
        ref.current.loading = false;
        setLoading(false);
        ref.current.loadingMore = false;
        setLoadingMore(false);
      }
    }, []);

    const updateResult = useCallback((result: IUseListData<T>) => {
      unstable_batchedUpdates(() => {
        ref.current.data = result;
        runWithoutUnmounted(() => setData(result));

        const {
          data = [],
          totalSize: _totalSize = 0,
          hasMore: _hasMore,
        } = result;

        ref.current.totalSize = _totalSize;
        runWithoutUnmounted(() => setTotalSize(_totalSize));

        let _list: Array<T> = [];
        if (ref.current.loadingMore) {
          _list = ref.current.list.concat(data);
        } else {
          _list = data;
        }
        ref.current.list = _list;
        runWithoutUnmounted(() => setList(_list));

        ref.current.hasMore =
          _hasMore ??
          (ref.current.pageSize * ref.current.pageNo < _totalSize &&
            _list.length < _totalSize);
        runWithoutUnmounted(() => setHasMore(ref.current.hasMore));

        ref.current.error = undefined;
      });
    }, []);

    // 数据请求方法
    const onFetch = useCallback(
      debounce(duration, (_query, onComplete?: () => void) => {
        switch (queueType) {
          case 'queue':
            runWithQueue(
              async () => {
                try {
                  const result = await getData(_query, ref.current.props);
                  updateResult(result ?? {});
                  return result;
                } catch (err) {
                  ref.current.error = err;
                  throw err;
                } finally {
                  runWithoutUnmounted(() => setError(ref.current.error));
                }
              },
              () => {
                runWithoutUnmounted(() => changeLoading(false));
                onComplete?.();
              }
            );
            break;
          case 'unique':
            runWithUnique(
              async () => {
                try {
                  const result = await getData(_query, ref.current.props);
                  return result;
                } catch (err) {
                  ref.current.error = err;
                  throw err;
                } finally {
                  runWithoutUnmounted(() => setError(ref.current.error));
                }
              },
              (result: IUseListData<T>) => updateResult(result ?? {}),
              () => {
                runWithoutUnmounted(() => changeLoading(false));
                onComplete?.();
              }
            );
            break;
          default:
            break;
        }
      }),
      []
    );

    // 数据加载方法
    const onLoad = useCallback((_query, onComplete?: () => void) => {
      changeLoading(true);

      // 通过筛选条件转换钩子函数获取转换后的请求条件
      const newQuery = getQuery(
        {
          pageNo: ref.current.pageNo,
          pageSize: ref.current.pageSize,
          ..._query,
        },
        ref.current.props
      );

      ref.current.targetQuery = newQuery;
      setTargetQuery(newQuery);

      onFetch(newQuery, onComplete);
    }, []);

    // 数据刷新方法
    const onRefresh = useCallback(
      (reload?: boolean, onComplete?: () => void) => {
        const _reload = typeof reload === 'boolean' ? reload : false;
        if (_reload) {
          ref.current.pageNo = 1;
          setPageNo(1);
        }

        onLoad(ref.current.query, onComplete);
      },
      []
    );

    // 数据加载更多方法
    const onLoadMore = useCallback(
      debounce(duration, () => {
        changeLoading(true, true);

        ref.current.pageNo++;
        setPageNo(ref.current.pageNo);
      }),
      []
    );

    // 组件更新时监测页码变更，若变更自动执行数据加载方法
    useEffect(() => {
      if (!ref.current.inited) {
        return;
      }

      // 若缓存页码值与新页码值相等且都为1，说明为刷新逻辑，无需再次请求
      if (ref.current.pageNo === pageNo && pageNo === 1) {
        return;
      }

      ref.current.pageNo = pageNo;
      onLoad(ref.current.query);
    }, [pageNo]);

    // 组件更新时监测页数和查询参数变更，若变更自动执行数据加载方法
    useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      ref.current.pageSize = pageSize;
      ref.current.query = query;
      onRefresh(true);
    }, [pageSize, query]);

    // 组件更新时监测组件Props参数变更（通过关联属性过滤），若变更自动执行数据加载方法
    useEffect(() => {
      if (!ref.current.inited) {
        return;
      }
      const oldProps = ref.current.props;
      ref.current.props = props;
      if (deps.find(p => (oldProps as any)[p] !== (props as any)[p])) {
        onRefresh(true);
      }
    }, [props]);

    // 组件初始化时判断是否自动执行数据加载方法
    useEffect(() => {
      setInited(true);
      ref.current.inited = true;

      if (immediate) {
        onLoad(ref.current.query);
      }
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
      targetQuery,
      list,
      data,
      error,
      ref,
    };

    const listAction = {
      setInited,
      setLoading,
      setLoadingMore,
      setPageNo,
      setPageSize,
      setTotalSize,
      setQuery,
      setTargetQuery,
      setList,
      setData,
      setError,
      onLoad,
      onRefresh,
      onLoadMore,
    };

    const ret = [listResult, listAction] as const;

    return ret;
  }

  return useList;
}
