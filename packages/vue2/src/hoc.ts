import omit from 'omit.js';
import { debounce } from 'lodash-es';

export interface IBuildWithDataOptions<T> {
  property?: string;
  properties?: { [key: string]: any };
  data: T;
  getData?: (_: any, props: { [key: string]: any }) => Promise<T>;
}

export function buildWithData<T>(options: IBuildWithDataOptions<T>) {
  const { property = 'data', data, properties = {} } = options;

  const getData = options.getData || (() => Promise.resolve(data));

  return function withData(Component: any, componentName: string) {
    return {
      name: componentName,
      mixins: [omit(Component, ['props'])],
      props: Object.assign({}, omit(Component.props, [property]), properties),
      data() {
        return {
          [property]: data,
          onInitData: null,
        };
      },
      created() {
        const ctx: any = this;
        ctx.onInitData = debounce(function() {
          getData(ctx, ctx.$props).then(data => (ctx[property] = data));
        }, 200);
        ctx.onInitData();
      },
      watch: {
        ...Object.keys(properties).reduce((p, c) => {
          p[c] = function() {
            this.onInitData();
          };
          return p;
        }, {} as { [key: string]: any }),
      },
    };
  };
}
