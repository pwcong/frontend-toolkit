import React, { ForwardedRef, forwardRef } from 'react';

import { getDisplayName } from '../utils';

/**
 * 组件默认属性Hoc
 * @param defaultProps 默认属性
 * @returns
 */
export function withDefaultProps<P = {}, R = any>(defaultProps?: Partial<P>) {
  return function(Component: any) {
    const WrappedComponent = (props: P, ref: ForwardedRef<R>) => {
      return React.createElement(Component, {
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
