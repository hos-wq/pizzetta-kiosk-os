export const AUTH_CALLBACK_PARAM = '__br_auth'
export const isAuthCallbackSearch = (search: string) => new URLSearchParams(search).get(AUTH_CALLBACK_PARAM) === 'callback'
export const clearAuthCallbackSearch = (pathname: string, search: string) => {
  const params = new URLSearchParams(search)
  params.delete(AUTH_CALLBACK_PARAM)
  const encoded = params.toString()
  return `${pathname}${encoded ? `?${encoded}` : ''}`
}

export async function checkOwnerSession(fetcher: typeof fetch = fetch, localDevelopment = false): Promise<boolean> {
  const options = {
    credentials: 'same-origin' as const, cache: 'no-store' as const,
    headers: { Accept: 'application/json', ...(localDevelopment ? { 'x-dev-auth': 'owner' } : {}) },
  };
  const response = await fetcher('/auth/session', options);
  if (response.status === 401) return false;
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Session check failed');
  const payload = await response.json() as { data?: { authenticated?: unknown; user?: { subject?: unknown; role?: unknown; email?: unknown } } };
  if (payload?.data?.authenticated !== true) return false;
  const user = payload.data.user;
  // Development access must also be confirmed by the local server.
  if (localDevelopment && user?.subject === 'dev-owner') return true;
  return user?.role === 'OWNER' && user?.email === 'boutiquerooms.makati@gmail.com' && typeof user?.subject === 'string' && user.subject.length > 0;
}
