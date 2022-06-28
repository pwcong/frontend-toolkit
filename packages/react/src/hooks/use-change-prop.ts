import {
  createElement,
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { getDisplayName } from '../utils';
import { useRef } from './use-ref';
import { useQueue } from './use-queue';

type IChangeFn<T> = (value?: T, ...args: any[]) => void;

export type IWithChangeProps<T, P> = Omit<P, 'value' | 'onChange'> & {
  value?: T;
  onChange?: IChangeFn<T>;
};

export type IWithChangePropOptions<T = any, P = {}> = {
  /** 转换器 */
  parser?: {
    /** 输入转换 */
    input?: (value: T | undefined, props: P) => T | undefined;
    /** 输出转换 */
    output?: (value: T | undefined, props: P) => T | undefined;
  };
};

/**
 * 组件变更属性Hoc
 * @param options Hoc配置
 * @returns
 */
export function withChangeProp<T = any, P = {}, R = any>(
  options?: IWithChangePropOptions<T, IWithChangeProps<T, P>>
) {
  const { input = (v: T | undefined) => v, output = (v: T | undefined) => v } =
    options?.parser ?? {};

  return function(Component: any) {
    const WrappedComponent = (
      props: IWithChangeProps<T, P>,
      ref: ForwardedRef<R>
    ) => {
      const { value, onChange, ...restProps } = props;

      const propsRef = useRef(props);

      const handleChange = useCallback(
        ((newValue, ...args) => {
          onChange?.(output(newValue, propsRef.current), ...args);
        }) as IChangeFn<T>,
        [onChange]
      );

      return createElement(Component, {
        ...restProps,
        ref,
        value: input(value, props as P),
        onChange: handleChange,
      });
    };

    WrappedComponent.displayName = `withChangeProp(${getDisplayName(
      Component
    )})`;

    return forwardRef<R, IWithChangeProps<T, P>>(WrappedComponent);
  };
}

export type IWithAsyncChangePropOptions<T = any, P = {}> = {
  /** 转换器 */
  parser?: {
    /** 输入转换 */
    input?: (value: T | undefined, props: P) => Promise<T | undefined>;
    /** 输出转换 */
    output?: (value: T | undefined, props: P) => Promise<T | undefined>;
  };
};

/**
 * 组件异步变更属性Hoc
 * @param options Hoc配置
 * @returns
 */
export function withAsyncChangeProp<T = any, P = {}, R = any>(
  options?: IWithAsyncChangePropOptions<T, IWithChangeProps<T, P>>
) {
  const {
    input = (v: T | undefined) => Promise.resolve(v),
    output = (v: T | undefined) => Promise.resolve(v),
  } = options?.parser ?? {};

  return function(Component: any) {
    const WrappedComponent = (
      props: IWithChangeProps<T, P>,
      ref: ForwardedRef<R>
    ) => {
      const { value, onChange, ...restProps } = props;
      const [currentValue, setCurrentValue] = useState<T | undefined>();

      const propsRef = useRef(props);

      const [, run] = useQueue();

      const handleChange = useCallback(
        ((v, ...args) => {
          setCurrentValue(v);

          output(v, propsRef.current).then(newValue => {
            onChange?.(newValue, ...args);
          });
        }) as IChangeFn<T>,
        [onChange]
      );

      useEffect(() => {
        run(() => input(value, propsRef.current).then(setCurrentValue));
      }, [value]);

      return createElement(Component, {
        ...restProps,
        ref,
        value: currentValue,
        onChange: handleChange,
      });
    };

    WrappedComponent.displayName = `withAsyncChangeProp(${getDisplayName(
      Component
    )})`;

    return forwardRef<R, IWithChangeProps<T, P>>(WrappedComponent);
  };
}
