import { debounce } from 'lodash-es';
import { ref, reactive, computed, watch, onActivated } from 'vue';

export enum EListPlatform {
  'DESKTOP' = 'DESKTOP',
  'MOBILE' = 'MOBILE',
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
  getQuery?: (
    props: P,
    query: { [key: string]: any }
  ) => { [key: string]: any };
  getData?: (
    props: P,
    query: { [key: string]: any }
  ) => Promise<{ data: Array<T>; totalSize: number }>;
}

export function buildUseList<T, P>(options: IBuildUseListOptions<T, P>) {
  const {
    platform = EListPlatform.DESKTOP,
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getQuery = (_, query) => query,
    getData = () => Promise.resolve({ data: [], totalSize: 0 }),
  } = options;

  return function useList(props: P, defaultQuery?: IUseListQuery) {
    const inited = ref(false);
    const loading = ref(false);
    const loadingMore = ref(false);
    const list = ref<Array<T>>([]);

    const query = reactive(
      properties.reduce((p, c) => {
        if (typeof c === 'object') {
          p[c.key] = c.value;
        } else {
          p[c] = undefined;
        }
        return p;
      }, {} as { [key: string]: any })
    );

    defaultQuery = Object.assign(
      {
        pageNo: 1,
        pageSize: 10,
      },
      defaultQuery
    );

    const pageNo = ref(defaultQuery.pageNo);
    const pageSize = ref(defaultQuery.pageSize);
    const totalSize = ref(0);
    const hasMore = computed(
      () =>
        pageSize.value * pageNo.value < totalSize.value &&
        list.value.length < totalSize.value
    );

    const onLoad = debounce(function(query) {
      loading.value = true;

      setTimeout(async () => {
        try {
          query = getQuery(
            props,
            Object.assign(
              {
                pageNo: pageNo.value,
                pageSize: pageSize.value,
              },
              query
            )
          );

          const targetQuery = Object.keys(query).reduce((p, c) => {
            const v = query[c];
            if (v !== '' && v !== undefined && v !== null) {
              p[c] = v;
            }
            return p;
          }, {} as { [key: string]: any });

          const { data = [], totalSize: _totalSize = 0 } = await getData(
            props,
            targetQuery
          );

          totalSize.value = _totalSize;

          if (loadingMore.value) {
            // @ts-ignore
            list.value = list.value.concat(data);
          } else {
            // @ts-ignore
            list.value = data;
          }
        } catch (e) {
          console.error(e);
        } finally {
          loading.value = false;
          loadingMore.value = false;
        }
      });
    }, duration);

    const onRefresh = debounce(function(reload?: boolean) {
      if (reload === undefined) {
        reload = true;
      }

      if (loading.value) {
        return;
      }
      !!reload && (pageNo.value = 1);
      onLoad(query);
    }, duration);

    const onLoadMore = debounce(function() {
      if (loading.value) {
        return;
      }
      loadingMore.value = true;
      pageNo.value++;
    }, duration);

    watch(pageNo, () => onLoad(query));

    watch(pageSize, () => {
      onRefresh(true);
    });

    watch(
      query,
      () => {
        onRefresh(true);
      },
      {
        deep: true,
      }
    );

    relation.forEach(p =>
      watch(
        () => (props as any)[p],
        () => onRefresh(true)
      )
    );

    onActivated(function() {
      if (immediate) {
        if (inited.value) {
          onRefresh(platform === EListPlatform.MOBILE);
        }
        inited.value = true;
      }
    });

    if (immediate) {
      onLoad(query);
    }

    return {
      inited,
      loading,
      loadingMore,
      list,
      query,
      pageNo,
      pageSize,
      totalSize,
      hasMore,
      onLoad,
      onRefresh,
      onLoadMore,
    };
  };
}
