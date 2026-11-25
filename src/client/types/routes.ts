/** DSH 工作台内部页面；不依赖 React Native 导航容器。 */
export type PageId = 'overview' | 'scope' | 'styles' | 'records' | 'knowledge';
export type AppNavigation = {
  navigate: (page: PageId) => void;
};
export type AppRoute = {
  name: PageId;
};
