/**
 * Client-side helper: wraps fetch() to include admin auth headers.
 * Reads admin credentials from localStorage (same values used by Zustand store).
 */

export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  try {
    const isAuth = localStorage.getItem('idm_admin_auth');
    const raw = localStorage.getItem('idm_admin_user');
    const hash = localStorage.getItem('idm_admin_hash');

    console.log('[adminFetch] isAuth:', isAuth, '| hasUser:', !!raw, '| hasHash:', !!hash);

    if (isAuth !== 'true') {
      console.log('[adminFetch] BLOCKED: idm_admin_auth is not true');
      return {};
    }

    if (!raw) {
      console.log('[adminFetch] BLOCKED: no idm_admin_user');
      return {};
    }

    const user = JSON.parse(raw);
    if (!user?.id) {
      console.log('[adminFetch] BLOCKED: user has no id');
      return {};
    }

    if (!hash) {
      console.log('[adminFetch] BLOCKED: no idm_admin_hash');
      return {};
    }

    console.log('[adminFetch] OK: sending headers for', user.name);
    return {
      'x-admin-id': user.id,
      'x-admin-hash': hash,
    };
  } catch (e) {
    console.error('[adminFetch] ERROR:', e);
    return {};
  }
}

/**
 * Check if admin is currently authenticated (has valid localStorage data)
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isAuth = localStorage.getItem('idm_admin_auth') === 'true';
    const raw = localStorage.getItem('idm_admin_user');
    const hash = localStorage.getItem('idm_admin_hash');
    return isAuth && !!raw && !!hash;
  } catch {
    return false;
  }
}

/**
 * Clear admin auth from localStorage and dispatch logout event
 */
export function clearAdminAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('idm_admin_auth');
  localStorage.removeItem('idm_admin_user');
  localStorage.removeItem('idm_admin_hash');

  window.dispatchEvent(new CustomEvent('admin-auth-changed', { detail: { authenticated: false } }));
}

export function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const adminHeaders = getAdminAuthHeaders();

  const headers: Record<string, string> = {};

  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.entries(existingHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  if (!headers['x-admin-id'] && adminHeaders['x-admin-id']) {
    headers['x-admin-id'] = adminHeaders['x-admin-id'];
  }
  if (!headers['x-admin-hash'] && adminHeaders['x-admin-hash']) {
    headers['x-admin-hash'] = adminHeaders['x-admin-hash'];
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
