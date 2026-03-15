export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: import('./user').User;
}

export interface KakaoLoginRequest {
  accessToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
