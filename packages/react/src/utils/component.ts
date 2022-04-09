import React from 'react';

/**
 * 获取组件名称
 * @param Component 组件定义
 * @returns
 */
export function getDisplayName(Component: any) {
  return (
    Component.displayName ||
    Component.name ||
    (typeof Component === 'string' && Component.length > 0
      ? Component
      : 'Unknown')
  );
}

/**
 * 比较Key是否相等
 * @param key1 key1
 * @param key2 key2
 * @returns
 */
export function isSameKey(
  key1?: React.Key | React.Key[],
  key2?: React.Key | React.Key[]
) {
  if (key1 === key2) {
    return true;
  }

  if (Array.isArray(key1) && Array.isArray(key2)) {
    if (key1.length !== key2.length) {
      return false;
    }

    const s1 = key1.sort();
    const s2 = key2.sort();

    for (let i = 0, l = s1.length; i < l; i++) {
      if (s1[i] !== s2[i]) {
        return false;
      }
    }

    return true;
  }

  return false;
}
