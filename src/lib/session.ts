import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Get the current player session on the server side.
 * Returns null if not authenticated.
 */
export async function getPlayerSession() {
  return getServerSession(authOptions);
}

/**
 * Require player authentication — returns session or throws 401 response.
 * Use in API routes that need authentication.
 */
export async function requirePlayerAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return session;
}
