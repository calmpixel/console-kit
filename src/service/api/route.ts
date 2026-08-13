import { request } from '../request';

/** get constant routes */
export async function fetchGetConstantRoutes() {
  const { data, error } = await request<{ ok?: boolean; routes?: Api.Route.MenuRoute[] }>({
    url: '/route/getConstantRoutes'
  });
  if (error) {
    return { data: null, error };
  }
  return { data: (data?.routes || []) as Api.Route.MenuRoute[], error: null };
}

/** get user routes */
export async function fetchGetUserRoutes() {
  const { data, error } = await request<{ ok?: boolean; routes?: Api.Route.MenuRoute[]; home?: string }>({
    url: '/route/getUserRoutes'
  });
  if (error) {
    return { data: null, error };
  }
  return {
    data: {
      routes: (data?.routes || []) as Api.Route.MenuRoute[],
      home: (data?.home || 'overview') as Api.Route.UserRoute['home']
    },
    error: null
  };
}

/**
 * whether the route is exist
 *
 * @param routeName route name
 */
export async function fetchIsRouteExist(routeName: string) {
  const { data, error } = await request<{ ok?: boolean; data?: boolean }>({
    url: '/route/isRouteExist',
    params: { routeName }
  });
  if (error) {
    return { data: null, error };
  }
  return { data: Boolean(data?.data), error: null };
}
