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
