import React, { useRef, useState, useEffect, useCallback } from 'react';

interface IBuildUseCommonFormOptions<T, P> {
  immediate?: boolean;
  defaultValue: T;
  getValue?: (prevValue: T, props: P) => Promise<T>;
}

export function buildUseCommonForm<T, P>(
  options: IBuildUseCommonFormOptions<T, P>
) {
  return function useCommonForm(props: P) {
    const {
      immediate = false,
      defaultValue,
      getValue = (prevValue: T) => Promise.resolve(prevValue),
    } = options;

    const [value, setValue] = useState(defaultValue);
    const cacheValue = useRef({
      prev: value,
    });

    const cacheProps = useRef(props);

    const [loading, setLoading] = useState(false);

    const changeValue = React.useCallback((nextValue: T, done?: boolean) => {
      setValue(nextValue);
      if (done) {
        cacheValue.current.prev = nextValue;
      }
    }, []);

    const fetchValue = React.useCallback(async () => {
      setLoading(true);
      try {
        const nextValue = await getValue(
          cacheValue.current.prev,
          cacheProps.current
        );
        changeValue(nextValue, true);
        return nextValue;
      } catch (e) {
        throw e;
      } finally {
        setLoading(false);
      }
    }, []);

    const resetValue = React.useCallback(() => {
      changeValue(cacheValue.current.prev);
    }, []);

    useEffect(() => {
      cacheProps.current = props;
    }, [props]);

    useEffect(() => {
      if (immediate) {
        fetchValue();
      }
    }, []);

    return [
      {
        value,
        cacheValue,
        loading,
      },
      {
        changeValue,
        fetchValue,
        resetValue,
      },
    ];
  };
}

export type ICommonFormProps<T> = {
  value: T;
  loading: boolean;
  onInit: () => void;
  onOk: (value: T, done?: boolean) => void;
  onCancel: (done?: boolean) => void;
};

type IWithCommonFormProps<T, P = Record<string, unknown>> = P &
  Partial<ICommonFormProps<T>> &
  Partial<{
    onChange: (value: T) => void;
  }>;

export function withCommonForm<T, P = Record<string, unknown>>(
  Component: any,
  options: IBuildUseCommonFormOptions<T, P>
) {
  const useCommonForm = buildUseCommonForm<T, P>(options);

  const WrappedComponent: React.FC<IWithCommonFormProps<T, P>> = props => {
    const {
      value: propsValue,
      onInit: propsInit,
      onOk: propsOnOk,
      onChange: propsChange,
      onCancel: propsOnCancel,
    } = props;

    const [
      { loading, value },
      { changeValue, fetchValue, resetValue },
    ] = useCommonForm(props);

    const onInit = useCallback(async () => {
      await fetchValue?.();
      propsInit?.();
    }, [propsInit]);

    const onOk = useCallback(
      (newValue: T, done?: boolean) => {
        if (done) {
          changeValue?.(newValue, true);
          propsChange?.(newValue);
          propsOnOk?.(newValue, true);
        } else {
          changeValue?.(newValue);
        }
      },
      [propsChange, propsOnOk]
    );

    const onCancel = useCallback(
      (done?: boolean) => {
        resetValue?.();
        if (done) {
          propsOnCancel?.();
        }
      },
      [propsOnCancel]
    );

    useEffect(() => {
      if (propsValue !== undefined) {
        changeValue?.(propsValue, true);
      }
    }, [propsValue]);

    return React.createElement(Component, {
      ...props,
      loading,
      value,
      onInit,
      onOk,
      onCancel,
    });
  };

  return WrappedComponent;
}
