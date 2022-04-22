import {
  createElement,
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getDisplayName } from '../utils';

export type IWithValueProps<T = any, P = {}> = Omit<P, 'value' | 'onChange'> & {
  /** 当前值 */
  value?: T;
  /** 变更回调函数 */
  onChange?: (value?: T) => void;
};

export type IWithValueOptions<T = any> = {
  /** 值比较函数 */
  campareFn?: (nextValue?: T, preValue?: T) => boolean;
};

/**
 * 组件值Hook
 * @param props 组件属性
 * @param campareFn 值比较函数
 * @returns
 */
export function useValue<T = any, P = {}>(
  props: IWithValueProps<T, P>,
  campareFn: (nextValue?: T, preValue?: T) => boolean
) {
  const { value: propsValue, onChange: propsChange } = props;
  const [value, setValue] = useState<T>();
  const cacheValue = useRef<T>();

  const onChange = useCallback(
    (newValue?: T) => {
      cacheValue.current = newValue;
      setValue(newValue);
      propsChange?.(newValue);
    },
    [propsChange]
  );

  useEffect(() => {
    if (!campareFn(propsValue, cacheValue.current)) {
      cacheValue.current = propsValue;
      setValue(propsValue);
    }
  }, [propsValue]);

  const ret = [
    {
      value,
      cacheValue,
    },
    {
      onChange,
    },
  ] as const;

  return ret;
}

/**
 * 组件值Hoc
 * @param options Hoc配置
 * @returns
 */
export function withValue<T = any, P = {}, R = any>(
  options?: IWithValueOptions<T>
) {
  const { campareFn = (nv?: T, pv?: T) => nv === pv } = options ?? {};

  return function(Component: any) {
    const WrappedComponent = (
      props: IWithValueProps<T, P>,
      ref: ForwardedRef<R>
    ) => {
      const [{ value }, { onChange }] = useValue<T, P>(props, campareFn);

      return createElement(Component, {
        ...props,
        ref,
        value,
        onChange,
      });
    };

    WrappedComponent.displayName = `withValue(${getDisplayName(Component)})`;

    return forwardRef<R, IWithValueProps<T, P>>(WrappedComponent);
  };
}
