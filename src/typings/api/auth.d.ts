declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      refreshToken: string;
    }

    interface UserInfo {
      userId: string;
      userName: string;
      /** Custom avatar URL from /auth/me (e.g. /api/console/v1/media/avatars/1.jpg?t=…). */
      avatar: string;
      roles: string[];
      buttons: string[];
    }
  }
}
