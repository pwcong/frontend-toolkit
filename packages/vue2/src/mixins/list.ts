import { debounce } from 'lodash-es';

const listMixin = {
  data() {
    return {
      inited: false,
      loading: false,
      loadingMore: false,
      list: [],
      query: {},
      pageNo: 1,
      pageSize: 10,
      totalSize: 0,
    };
  },
  computed: {
    hasMore() {
      const ctx: any = this;
      return (
        ctx.pageSize * ctx.pageNo < ctx.totalSize &&
        ctx.list.length < ctx.totalSize
      );
    },
  },
};

export enum EListPlatform {
  'Desktop' = 'Desktop',
  'Mobile' = 'Mobile',
}

export interface IBuildListMixinOptions<T> {
  platform?: EListPlatform;
  immediate?: boolean;
  duration?: number;
  relation?: Array<string>;
  properties?: Array<string | { key: string; value: any }>;
  getQuery?: (_: any, query: { [key: string]: any }) => { [key: string]: any };
  getDataProperty?: string;
  getData?: (
    _: any,
    query: { [key: string]: any }
  ) => Promise<{ data: Array<T>; totalSize: number }>;
}

export function buildListMixin<T>(options: IBuildListMixinOptions<T>) {
  const {
    platform = EListPlatform.Desktop,
    immediate = true,
    duration = 200,
    relation = [],
    properties = [],
    getDataProperty = 'getData',
    getQuery = (_, query) => query,
    getData = () => Promise.resolve({ data: [], totalSize: 0 }),
  } = options;

  return {
    mixins: [listMixin],
    props: {
      [getDataProperty]: {
        type: Function,
        default: getData,
      },
    },
    data() {
      return {
        loading: immediate,
        query: properties.reduce((p, c) => {
          if (typeof c === 'object') {
            p[c.key] = c.value;
          } else {
            p[c] = undefined;
          }
          return p;
        }, {} as { [key: string]: any }),
        onLoad: null,
        onRefresh: null,
        onLoadMore: null,
      };
    },
    created() {
      const ctx: any = this;

      ctx.onLoad = debounce(function(query) {
        ctx.loading = true;

        setTimeout(async () => {
          try {
            if (!ctx[getDataProperty]) {
              return;
            }

            query = getQuery(
              ctx,
              Object.assign(
                {
                  pageNo: ctx.pageNo,
                  pageSize: ctx.pageSize,
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

            const { data = [], totalSize = 0 } = await ctx[getDataProperty](
              ctx,
              targetQuery
            );

            ctx.totalSize = totalSize;

            if (ctx.loadingMore) {
              ctx.list = ctx.list.concat(data);
            } else {
              ctx.list = data;
            }
          } catch (e) {
            console.error(e);
          } finally {
            ctx.loading = false;
            ctx.loadingMore = false;
          }
        });
      }, duration);

      ctx.onRefresh = debounce(function(reload = true) {
        if (ctx.loading) {
          return;
        }
        !!reload && (ctx.pageNo = 1);
        ctx.onLoad(ctx.query);
      }, duration);

      ctx.onLoadMore = debounce(function() {
        if (ctx.loading) {
          return;
        }
        ctx.loadingMore = true;
        ctx.pageNo++;
      }, duration);

      if (immediate) {
        ctx.onLoad(ctx.query);
      }
    },
    activated() {
      const ctx: any = this;
      if (immediate) {
        if (ctx.inited) {
          ctx.onRefresh(platform === EListPlatform.Mobile);
        }
        ctx.inited = true;
      }
    },
    watch: {
      ...['pageNo', 'pageSize', 'query', ...relation].reduce((p, c) => {
        switch (c) {
          case 'pageNo':
            p[c] = {
              handler() {
                this.onLoad(this.query);
              },
            };
            break;
          case 'pageSize':
            p[c] = {
              handler() {
                this.onRefresh(true);
              },
            };
            break;
          case 'query':
            p[c] = {
              deep: true,
              handler() {
                this.onRefresh(true);
              },
            };
            break;
          default:
            p[c] = {
              handler() {
                this.onRefresh(true);
              },
            };
            break;
        }

        return p;
      }, {} as { [key: string]: any }),
    },
  };
}
