import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_CALLBACK_URL, getAuthCallbackUrl, parseAuthCallbackUrl } from '@/lib/authDeepLink';

test('development builds use their own callback scheme beside TestFlight', () => {
  assert.equal(getAuthCallbackUrl('fitnessforge-dev'), 'fitnessforge-dev://auth/callback');
  assert.equal(getAuthCallbackUrl(''), 'fitnessforge://auth/callback');
});

test('mobile auth callback extracts an implicit session without logging tokens', () => {
  assert.deepEqual(
    parseAuthCallbackUrl(`${AUTH_CALLBACK_URL}#access_token=test-access&refresh_token=test-refresh&type=signup`),
    { type: 'session', accessToken: 'test-access', refreshToken: 'test-refresh' }
  );
});

test('mobile auth callback supports a PKCE authorization code', () => {
  assert.deepEqual(parseAuthCallbackUrl(`${AUTH_CALLBACK_URL}?code=test-code`), { type: 'code', code: 'test-code' });
});

test('mobile auth callback returns a readable provider error', () => {
  assert.deepEqual(
    parseAuthCallbackUrl(`${AUTH_CALLBACK_URL}#error=access_denied&error_description=Link+expired`),
    { type: 'error', message: 'Link expired' }
  );
});
