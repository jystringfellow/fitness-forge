const authScheme = process.env.EXPO_PUBLIC_AUTH_SCHEME?.trim() || 'fitnessforge';

export function getAuthCallbackUrl(scheme: string): string {
  return `${scheme.trim() || 'fitnessforge'}://auth/callback`;
}

export const AUTH_CALLBACK_URL = getAuthCallbackUrl(authScheme);

export type AuthCallbackResult =
  | { type: 'session'; accessToken: string; refreshToken: string }
  | { type: 'code'; code: string }
  | { type: 'error'; message: string }
  | { type: 'none' };

export function parseAuthCallbackUrl(url: string): AuthCallbackResult {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(fragment || query);
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { type: 'error', message: error };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { type: 'session', accessToken, refreshToken };

  const code = params.get('code');
  if (code) return { type: 'code', code };
  return { type: 'none' };
}
