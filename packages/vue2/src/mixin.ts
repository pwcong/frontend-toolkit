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
  'DESKTOP' = 'DESKTOP',
  'MOBILE' = 'MOBILE',
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
    platform = EListPlatform.DESKTOP,
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
          ctx.onRefresh(platform === EListPlatform.MOBILE);
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

export enum ESelectionValueType {
  'OBJECT' = 'OBJECT',
  'ARRAY' = 'ARRAY',
}

export interface IBuildSelectionMixinOptions {
  valueType: ESelectionValueType;
  defaultValue?: any;
  getValue?: (_: any, value: any) => any;
}

export function buildSelectionMixin(options: IBuildSelectionMixinOptions) {
  const { valueType } = options;

  let defaultValue = options.defaultValue;
  if (defaultValue === undefined) {
    defaultValue = valueType === ESelectionValueType.ARRAY ? [] : {};
  }

  const getValue =
    options.getValue ||
    ((_, value) => {
      if (valueType === ESelectionValueType.ARRAY) {
        return [].concat(defaultValue).concat(value || []);
      }
      return Object.assign({}, defaultValue, value || {});
    });

  return {
    props: {
      mode: {
        type: String,
      },
      readOnly: {
        type: Boolean,
      },
      value: {
        type: valueType,
        default: () => defaultValue,
      },
      visible: {
        type: Boolean,
      },
    },
    data() {
      const ctx: any = this;
      return {
        tempValue: getValue(ctx, ctx.$props.value),
        selectionContainer: () => document.body,
      };
    },
    methods: {
      onOk(done?: boolean) {
        if (done === undefined) {
          done = true;
        }

        const ctx: any = this;
        ctx.$emit('input', ctx.tempValue);
        ctx.$emit('change', ctx.tempValue);
        !!done && ctx.$emit('update:visible', false);
        !!done && ctx.$emit('close');
      },
      onCancel() {
        const ctx: any = this;
        ctx.$emit('update:visible', false);
        ctx.$emit('close');
      },
    },
    watch: {
      value: {
        deep: true,
        handler() {
          const ctx: any = this;
          ctx.tempValue = getValue(ctx, ctx.$props.value);
        },
      },
      visible(v: boolean, ov: boolean) {
        const ctx: any = this;
        if (!ov && v) {
          ctx.tempValue = getValue(ctx, ctx.$props.value);
        }
      },
    },
  };
}
