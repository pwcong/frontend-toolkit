import React, { useRef, useState, useEffect, useCallback } from 'react';

interface IBuildUseCommonFormOptions<T, P> {
  /** 是否立即加载数据 */
  immediate?: boolean;
  /** 默认值 */
  defaultValue: T;
  /** 加载数据钩子函数 */
  getValue?: (prevValue: T, props: P) => Promise<T>;
}

/**
 * 通用表单Hook工厂函数
 * @param options 通用表单Hook配置
 * @returns
 */
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

    // 缓存属性
    const cacheProps = useRef(props);

    const [loading, setLoading] = useState(false);

    // 值变更方法
    const changeValue = React.useCallback((nextValue: T, done?: boolean) => {
      setValue(nextValue);
      if (done) {
        cacheValue.current.prev = nextValue;
      }
    }, []);

    // 值刷新方法
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

    // 值重置方法
    const resetValue = React.useCallback(() => {
      changeValue(cacheValue.current.prev);
    }, []);

    // 组件更新时缓存属性
    useEffect(() => {
      cacheProps.current = props;
    }, [props]);

    // 组件初始化时判断可见性值变化进行值刷新
    useEffect(() => {
      if (immediate) {
        fetchValue();
      }
    }, []);

    const formResult = {
      value,
      cacheValue,
      loading,
    };
    const formAction = {
      changeValue,
      fetchValue,
      resetValue,
    };

    const ret: [typeof formResult, typeof formAction] = [
      formResult,
      formAction,
    ];

    return ret;
  };
}

export type ICommonFormProps<T> = {
  /** 表单值 */
  value: T;
  /** 是否加载中 */
  loading: boolean;
  /** 初始钩子函数 */
  onInit: () => void;
  /** 提交钩子函数 */
  onOk: (value: T, done?: boolean) => void;
  /** 取消钩子函数 */
  onCancel: (done?: boolean) => void;
};

type IWithCommonFormProps<T, P = {}> = P &
  Partial<ICommonFormProps<T>> &
  Partial<{
    onChange: (value: T) => void;
  }>;

/**
 * 通用表单Hoc
 * @param Component 组件
 * @param options 通用表单Hook配置
 * @returns
 */
export function withCommonForm<T, P = {}>(
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
      await fetchValue();
      propsInit?.();
    }, [propsInit]);

    const onOk = useCallback(
      (newValue: T, done?: boolean) => {
        if (done) {
          changeValue(newValue, true);
          propsChange?.(newValue);
          propsOnOk?.(newValue, true);
        } else {
          changeValue(newValue);
        }
      },
      [propsChange, propsOnOk]
    );

    const onCancel = useCallback(
      (done?: boolean) => {
        resetValue();
        if (done) {
          propsOnCancel?.();
        }
      },
      [propsOnCancel]
    );

    useEffect(() => {
      if (propsValue !== undefined) {
        changeValue(propsValue, true);
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
