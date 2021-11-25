import { debounce, omit } from 'lodash-es';

export interface IBuildWithDataOptions<T> {
  immediate?: boolean;
  property?: string;
  properties?: { [key: string]: any };
  data: T;
  getData?: (_: any, props: { [key: string]: any }) => Promise<T>;
}

export function buildWithData<T>(options: IBuildWithDataOptions<T>) {
  const {
    immediate = true,
    property = 'data',
    data,
    properties = {},
  } = options;

  const getData = options.getData || (() => Promise.resolve(data));

  return function withData(Component: any, componentName: string) {
    return {
      name: componentName,
      mixins: [omit(Component, ['props'])],
      props: Object.assign({}, omit(Component.props, [property]), properties),
      data() {
        return {
          [property]: data,
          onFetch: null,
        };
      },
      created() {
        const ctx: any = this;

        ctx.onFetch = debounce(function() {
          getData(ctx, ctx.$props).then(data => (ctx[property] = data));
        }, 200);

        if (immediate) {
          ctx.onFetch();
        }
      },
      watch: {
        ...Object.keys(properties).reduce((p, c) => {
          p[c] = function() {
            this.onFetch();
          };
          return p;
        }, {} as { [key: string]: any }),
      },
    };
  };
}
