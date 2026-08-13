import { request } from '../request';

/** Backend role object or legacy string code. */
type PlatformRole = {
  code: string;
  scope_kind?: string;
  scope_id?: number | string;
};

type PlatformUserPayload = {
  id?: number | string;
  username?: string;
  display_name?: string;
  avatar?: string;
  permissions?: string[];
  roles?: PlatformRole[] | string[];
};

type PlatformLoginBody = {
  ok?: boolean;
  token?: string;
  user?: PlatformUserPayload;
};

type PlatformMeBody = {
  ok?: boolean;
  user?: PlatformUserPayload;
};

function parseRoleCodes(roles?: PlatformRole[] | string[]): string[] {
  if (!roles?.length) {
    return [];
  }

  if (typeof roles[0] === 'string') {
    return (roles as string[]).filter(Boolean);
  }

  return (roles as PlatformRole[]).map(role => role.code).filter(Boolean);
}

function isSuperUser(roleCodes: string[], permissions: string[]): boolean {
  if (roleCodes.includes('platform_super')) {
    return true;
  }

  return permissions.includes('platform.role.manage') && permissions.includes('platform.user.manage');
}

/** Map /auth/login or /auth/me user payload to Soybean UserInfo. */
export function mapPlatformUserToUserInfo(user: PlatformUserPayload): Api.Auth.UserInfo {
  const permissions = user.permissions ?? [];
  const roleCodes = parseRoleCodes(user.roles);
  const superRole = import.meta.env.VITE_STATIC_SUPER_ROLE || 'R_SUPER';

  let roles: string[];

  if (roleCodes.length) {
    roles = [...roleCodes];
  } else if (permissions.length) {
    roles = ['R_USER'];
  } else {
    roles = [];
  }

  if (isSuperUser(roleCodes, permissions) && !roles.includes(superRole)) {
    roles = [...roles, superRole];
  }

  return {
    userId: String(user.id ?? user.username ?? ''),
    userName: user.display_name?.trim() || user.username || '',
    avatar: (user.avatar || '').trim(),
    roles,
    buttons: permissions
  };
}

/**
 * Login against platform console API.
 * Soybean form fields are userName/password; backend expects username/password.
 */
export async function fetchLogin(userName: string, password: string) {
  const { data, error } = await request<PlatformLoginBody>({
    url: '/auth/login',
    method: 'post',
    data: {
      username: userName,
      password
    }
  });

  if (error || !data?.token) {
    return { data: null, error: error || new Error('login failed') };
  }

  return {
    data: {
      token: data.token,
      refreshToken: data.token
    } satisfies Api.Auth.LoginToken,
    error: null
  };
}

/** Get user info */
export async function fetchGetUserInfo() {
  const { data, error } = await request<PlatformMeBody>({ url: '/auth/me' });

  if (error || !data?.user) {
    return { data: null, error: error || new Error('me failed') };
  }

  return {
    data: mapPlatformUserToUserInfo(data.user),
    error: null
  };
}

/** Refresh token — platform kit has no refresh endpoint; reuse current token. */
export async function fetchRefreshToken(refreshToken: string) {
  return {
    data: {
      token: refreshToken,
      refreshToken
    } satisfies Api.Auth.LoginToken,
    error: null
  };
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
