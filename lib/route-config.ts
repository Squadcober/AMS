export const dynamicConfig = {
  dynamic: 'force-dynamic',
  revalidate: false,
  fetchCache: 'force-no-store',
};

export function withDynamicConfig(component: any) {
  return Object.assign(component, dynamicConfig);
}
