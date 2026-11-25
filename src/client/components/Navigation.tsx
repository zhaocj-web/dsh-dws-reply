import React, { createContext, useContext } from 'react';
import type { AppNavigation, AppRoute } from '../types/routes';

type NavigationProviderProps = {
  navigation: AppNavigation;
  route: AppRoute;
  children: React.ReactNode;
};
const NavigationContext = createContext<AppNavigation | null>(null);
const RouteContext = createContext<AppRoute | null>(null);

/** 页面从上下文访问导航，不把导航方法混入业务 props。 */
export function NavigationProvider(props: NavigationProviderProps) {
  return (
    <NavigationContext.Provider value={props.navigation}>
      <RouteContext.Provider value={props.route}>{props.children}</RouteContext.Provider>
    </NavigationContext.Provider>
  );
}

export function useNavigation(): AppNavigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('页面必须在 NavigationProvider 内使用');
  return navigation;
}

export function useRoute(): AppRoute {
  const route = useContext(RouteContext);
  if (!route) throw new Error('页面必须在 NavigationProvider 内使用');
  return route;
}
