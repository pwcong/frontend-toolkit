import React, {
  createElement,
  cloneElement,
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { parseJSON, isSameKey } from '../utils';

export type IColumnKey = React.Key;

export type IColumnKeys = React.Key[];

export type IColumn = {
  /** 标识 */
  key: IColumnKey;
  /** 标题 */
  title: React.ReactNode;
  /** 是否动态 */
  dynamic: boolean;
};

export type IColumnChangerProps = {
  /** 列配置 */
  columns?: IColumn[];
  /** 当前列 */
  value?: IColumnKeys;
  /** 列变更事件 */
  onChange?: (value: IColumnKeys) => void;
  /** 列重置事件 */
  onReset?: () => void;
};

export type IUseColumnsConfig<C extends Record<any, any> = {}> = C & {
  /** 列配置标识 */
  key: IColumnKey;
  /** 列配置 */
  columns: Record<any, any>[];
  /** 默认列 */
  defaultKeys?: IColumnKeys;
};

export type IUseColumnsConfigs<
  C extends Record<any, any> = {}
> = IUseColumnsConfig<C>[];

export type IUseColumnsOptions = {
  /** 是否开启缓存 */
  cache?: boolean | string;
};

export type IBuildUseColumnsOptions<C extends Record<any, any> = {}> = {
  /** 标识字段名 */
  keyProperty: string;
  /** 标题字段名 */
  titleProperty: string;
  /** 动态字段名 */
  dynamicProperty: string;
  /** 列配置容器渲染函数 */
  renderWrapper?: (
    changers: Array<{
      changer: React.ReactElement;
      config: IUseColumnsConfig<C>;
    }>
  ) => React.ReactElement;
  /** 列配置组件渲染函数 */
  renderChanger: (
    props: IColumnChangerProps,
    config: IUseColumnsConfig<C>
  ) => React.ReactElement;
  /** 列触发组件渲染函数 */
  renderTrigger: (node: React.ReactElement) => React.ReactElement;
  /** 是否开启排序 */
  useSorter?: boolean;
};

// 默认缓存key
const defaultCacheKey = 'columns';

/**
 * 获取缓存key
 * @param cache
 * @returns
 */
function getStorageKey(key: IColumnKey, cache: boolean | string) {
  let cacheKey = defaultCacheKey;
  if (typeof cache === 'string') {
    cacheKey = cache;
  }
  return `${cacheKey}_${key}`;
}

/**
 * 获取列keys
 * @param key 缓存key
 * @returns
 */
function getCacheColumnKeys(key: string, defaultKeys: IColumnKeys) {
  return (
    parseJSON<IColumnKeys>(
      window.localStorage.getItem(key) ?? '',
      defaultKeys
    ) || defaultKeys
  );
}

/**
 * 缓存列keys
 * @param key 缓存key
 * @param value 缓存值
 */
function setCacheColumnKeys(key: string, value: IColumnKeys) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * 动态列表Hook工厂函数
 * @param buildOptions 动态列表配置
 * @returns
 */
export function buildUseColumns<C extends Record<any, any> = {}>(
  buildOptions: IBuildUseColumnsOptions<C>
) {
  const {
    keyProperty,
    titleProperty,
    dynamicProperty,
    renderWrapper = changers =>
      createElement(
        Fragment,
        undefined,
        changers.map(c => c.changer)
      ),
    renderChanger,
    renderTrigger,
    useSorter,
  } = buildOptions;

  /**
   * 动态列表Hook
   * @param configs 列表配置
   * @param options 可选配置
   * @returns
   */
  function useColumns(
    configs: IUseColumnsConfigs<C>,
    options?: IUseColumnsOptions
  ) {
    const { cache } = options ?? {};

    const storagedKeyss = useMemo(() => {
      const newKeyss = configs.map(({ key, columns, defaultKeys }) => {
        const allKeys = columns.map(column => column[keyProperty]);

        let keys = defaultKeys ?? allKeys;

        if (!cache) {
          return keys;
        }

        const _allKeys = getCacheColumnKeys(
          getStorageKey(`${key}_all`, cache),
          []
        );

        if (isSameKey(allKeys, _allKeys)) {
          keys = getCacheColumnKeys(getStorageKey(`${key}_cur`, cache), keys);
        } else {
          setCacheColumnKeys(getStorageKey(`${key}_all`, cache), allKeys);
        }

        return keys;
      });

      return newKeyss;
    }, [configs]);

    const [keyss, setKeyss] = useState<IColumnKeys[]>(storagedKeyss);
    const cacheKeyss = useRef(keyss);

    const handleSetKeys = useCallback((value: IColumnKeys, index: number) => {
      const newKeyss = [...cacheKeyss.current];
      newKeyss[index] = value;

      if (!!cache) {
        setCacheColumnKeys(
          getStorageKey(`${configs[index].key}_cur`, cache),
          value
        );
      }

      cacheKeyss.current = newKeyss;
      setKeyss(newKeyss);
    }, []);

    const columnss = useMemo(() => {
      return configs.map(({ columns }, index) => {
        const keys = keyss[index] ?? [];

        if (useSorter) {
          const columnsMap = columns.reduce((p, c) => {
            p[c[keyProperty]] = c;
            return p;
          }, {} as Record<IColumnKey, IColumn>);

          return keys.filter(k => !!columnsMap[k]).map(k => columnsMap[k]);
        }

        return columns.filter(column => keys.includes?.(column[keyProperty]));
      });
    }, [keyss, configs]);

    const trigger = useMemo(() => {
      const changers = configs.map((config, index) => {
        const { key, columns } = config;
        const _columns = columns.map(column => ({
          key: column[keyProperty],
          title: column[titleProperty],
          dynamic: column[dynamicProperty],
        }));

        const changer = cloneElement(
          renderChanger(
            {
              columns: _columns,
              value: keyss[index],
              onChange: value => handleSetKeys(value, index),
              onReset: () =>
                handleSetKeys(
                  columns.map(c => c[keyProperty]),
                  index
                ),
            },
            config
          ),
          {
            key,
          }
        );
        return {
          changer,
          config,
        };
      });

      return renderTrigger(renderWrapper(changers));
    }, [keyss, configs]);

    const ret = [columnss, trigger, keyss] as const;

    return ret;
  }

  return useColumns;
}
