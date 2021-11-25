export enum ESelectionValueType {
  'Object' = 'Object',
  'Array' = 'Array',
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
    defaultValue = valueType === ESelectionValueType.Array ? [] : {};
  }

  const getValue =
    options.getValue ||
    ((_, value) => {
      if (valueType === ESelectionValueType.Array) {
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
