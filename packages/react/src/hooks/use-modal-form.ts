import React, { useRef, useState, useEffect, useCallback } from 'react';

interface IUseModalFormOptions<T, P> {
  defaultValue: T;
  getValue?: (prevValue: T, props: P) => Promise<T>;
}

export function useModalForm<T, P>(
  props: P,
  options: IUseModalFormOptions<T, P>
) {
  const {
    defaultValue,
    getValue = (prevValue: T) => Promise.resolve(prevValue),
  } = options;

  const [visible, setVisible] = useState(false);
  const changeVisible = React.useCallback((nextVisible: boolean) => {
    setVisible(nextVisible);
  }, []);

  const [value, setValue] = useState(defaultValue);
  const cacheValue = useRef({
    prev: value,
  });

  const changeValue = React.useCallback(
    (nextValue: T, done?: boolean) => {
      setValue(nextValue);
      if (done) {
        cacheValue.current.prev = nextValue;
      }
    },
    [cacheValue]
  );

  const fetchValue = React.useCallback(async () => {
    try {
      const nextValue = await getValue(cacheValue.current.prev, props);
      changeValue(nextValue);
    } catch {}
  }, [cacheValue, changeValue, props]);

  const resetValue = React.useCallback(() => {
    changeValue(cacheValue.current.prev);
  }, [cacheValue, changeValue]);

  useEffect(() => {
    if (visible) {
      fetchValue();
    } else {
      resetValue();
    }
  }, [visible, fetchValue, resetValue]);

  return [
    {
      value,
      cacheValue,
      visible,
    },
    {
      changeValue,
      fetchValue,
      resetValue,
      changeVisible,
    },
  ];
}

export type IModalFormProps<T> = {
  value: T;
  visible: boolean;
  onInit: () => void;
  onOk: (value: T, done?: boolean) => void;
  onCancel: (done?: boolean) => void;
};

type IWithModalFormProps<T, P> = P & Partial<IModalFormProps<T>>;

export function withModalForm<T, P>(
  Component: any,
  options: IUseModalFormOptions<T, P>
) {
  const WrappedComponent = function(props: IWithModalFormProps<T, P>) {
    const {
      value: propsValue,
      visible: propsVisible,
      onOk: propsOnOk,
      onCancel: propsOnCancel,
    } = props;

    const [
      { value, visible },
      { changeValue, fetchValue, resetValue, changeVisible },
    ] = useModalForm(props, options);

    useEffect(() => {
      if (propsValue !== undefined) {
        changeValue?.(propsValue, true);
      }
    }, [propsValue, changeValue]);

    useEffect(() => {
      if (propsVisible !== undefined) {
        changeVisible?.(propsVisible);
      }
    }, [propsVisible, changeVisible]);

    const onInit = useCallback(() => {
      fetchValue?.();
    }, [fetchValue]);

    const onOk = useCallback(
      (newValue: T, done?: boolean) => {
        if (done) {
          changeValue?.(newValue, true);
          changeVisible?.(false);
          propsOnOk?.(newValue, true);
        } else {
          changeValue?.(newValue);
        }
      },
      [propsOnOk, changeValue, changeVisible]
    );

    const onCancel = useCallback(
      (done?: boolean) => {
        resetValue?.();
        if (done) {
          changeVisible?.(false);
          propsOnCancel?.();
        }
      },
      [propsOnCancel, changeVisible, resetValue]
    );

    return React.createElement(Component, {
      ...props,
      value,
      visible,
      onInit,
      onOk,
      onCancel,
    });
  };

  WrappedComponent.displayName = `withModalForm(${Component.displayName ||
    'Component'})`;

  return WrappedComponent;
}
