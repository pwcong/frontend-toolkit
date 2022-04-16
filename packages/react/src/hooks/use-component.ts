import { createElement, ForwardedRef, forwardRef, useCallback } from 'react';

import { getDisplayName } from '../utils';

/**
 * 组件默认属性Hoc
 * @param defaultProps 默认属性
 * @returns
 */
export function withDefaultProps<P = {}, R = any>(defaultProps?: Partial<P>) {
  return function(Component: any) {
    const WrappedComponent = (props: P, ref: ForwardedRef<R>) => {
      return createElement(Component, {
        ref,
        ...defaultProps,
        ...props,
      });
    };

    WrappedComponent.displayName = `withDefaultProps(${getDisplayName(
      Component
    )})`;

    return forwardRef<R, P>(WrappedComponent);
  };
}

type IChangeFn<T> = (value?: T, ...args: any[]) => void;

/**
 * 组件变更属性Hoc
 * @param options Hoc配置
 * @returns
 */
export function withChangeProp<T = any, P = {}, R = any>(options?: {
  /** 转换器 */
  parser?: {
    /** 输入转换 */
    input?: (value?: T) => T | undefined;
    /** 输出转换 */
    output?: (value?: T) => T | undefined;
  };
}) {
  type IProps = Omit<P, 'value' | 'onChange'> & {
    value?: T;
    onChange?: IChangeFn<T>;
  };

  const { input = (v?: T) => v, output = (v?: T) => v } = options?.parser ?? {};

  return function(Component: any) {
    const WrappedComponent = (
      { value, onChange, ...restProps }: IProps,
      ref: ForwardedRef<R>
    ) => {
      const handleChange = useCallback(
        ((newValue, ...args) => {
          onChange?.(output(newValue), ...args);
        }) as IChangeFn<T>,
        [onChange]
      );

      return createElement(Component, {
        ...restProps,
        ref,
        value: input(value),
        onChange: handleChange,
      });
    };

    WrappedComponent.displayName = `withChangeProp(${getDisplayName(
      Component
    )})`;

    return forwardRef<R, IProps>(WrappedComponent);
  };
}
