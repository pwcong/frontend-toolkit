import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface IBuildUseModalFormOptions<T, P> {
  /** 默认值 */
  defaultValue: T;
  /** 加载数据钩子函数 */
  getValue?: (prevValue: T, props: P) => Promise<T>;
}

/**
 * 弹窗表单Hook工厂函数
 * @param options  弹窗表单Hook配置
 * @returns
 */
export function buildUseModalForm<T, P>(
  options: IBuildUseModalFormOptions<T, P>
) {
  /**
   * 弹窗表单Hook
   * @param props 组件Props
   * @returns
   */
  function useModalForm(props: P) {
    const {
      defaultValue,
      getValue = (prevValue: T) => Promise.resolve(prevValue),
    } = options;

    const [visible, setVisible] = useState(false);
    const changeVisible = React.useCallback((nextVisible: boolean) => {
      setVisible(nextVisible);
    }, []);
    const [value, setValue] = useState(defaultValue);

    // 缓存数据
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
        changeValue(nextValue);
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

    // 组件更新时判断可见性值变化进行值刷新或重置
    useEffect(() => {
      if (visible) {
        fetchValue();
      } else {
        resetValue();
      }
    }, [visible]);

    const formResult = {
      value,
      cacheValue,
      loading,
      visible,
    };
    const formAction = {
      changeValue,
      fetchValue,
      resetValue,
      changeVisible,
    };

    const ret: [typeof formResult, typeof formAction] = [
      formResult,
      formAction,
    ];

    return ret;
  }

  return useModalForm;
}

export type IModalFormProps<T> = {
  /** 表单值 */
  value: T;
  /** 弹窗可见性 */
  visible: boolean;
  /** 是否加载中 */
  loading: boolean;
  /** 初始钩子函数 */
  onInit: () => void;
  /** 提交钩子函数 */
  onOk: (value: T, done?: boolean) => void;
  /** 取消钩子函数 */
  onCancel: (done?: boolean) => void;
};

export type IWithModalFormProps<T, P = {}> = P &
  Partial<IModalFormProps<T>> &
  Partial<{
    onChange: (value: T) => void;
  }>;

export function withModalForm<T, P = {}>(
  Component: any,
  options: IBuildUseModalFormOptions<T, P>
) {
  const useModalForm = buildUseModalForm<T, P>(options);

  const WrappedComponent: React.FC<IWithModalFormProps<T, P>> = props => {
    const {
      value: propsValue,
      visible: propsVisible,
      onInit: propsInit,
      onOk: propsOnOk,
      onChange: propsChange,
      onCancel: propsOnCancel,
    } = props;

    const [
      { loading, value, visible },
      { changeValue, fetchValue, resetValue, changeVisible },
    ] = useModalForm(props);

    const onInit = useCallback(async () => {
      await fetchValue();
      propsInit?.();
    }, [propsInit]);

    const onOk = useCallback(
      (newValue: T, done?: boolean) => {
        if (done) {
          changeValue(newValue, true);
          changeVisible(false);
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
          changeVisible(false);
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

    useEffect(() => {
      if (propsVisible !== undefined) {
        changeVisible(propsVisible);
      }
    }, [propsVisible]);

    return React.createElement(Component, {
      ...props,
      loading,
      value,
      visible,
      onInit,
      onOk,
      onCancel,
    });
  };

  return WrappedComponent;
}
