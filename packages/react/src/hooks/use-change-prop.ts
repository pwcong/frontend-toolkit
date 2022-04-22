import { createElement, ForwardedRef, forwardRef, useCallback } from 'react';

import { getDisplayName } from '../utils';

export type IWithChangePropOptions<T = any> = {
  /** 转换器 */
  parser?: {
    /** 输入转换 */
    input?: (value?: T) => T | undefined;
    /** 输出转换 */
    output?: (value?: T) => T | undefined;
  };
};

/**
 * 组件变更属性Hoc
 * @param options Hoc配置
 * @returns
 */
export function withChangeProp<T = any, P = {}, R = any>(
  options?: IWithChangePropOptions<T>
) {
  type IChangeFn = (value?: T, ...args: any[]) => void;

  type IProps = Omit<P, 'value' | 'onChange'> & {
    value?: T;
    onChange?: IChangeFn;
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
        }) as IChangeFn,
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
