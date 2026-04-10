import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verify that the request comes from an authenticated admin.
 */
export async function verifyAdmin(request: NextRequest): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
} | null> {
  try {
    const adminId = request.headers.get('x-admin-id');
    const adminHash = request.headers.get('x-admin-hash');
    const method = request.method;
    const path = request.nextUrl.pathname;

    console.log(`[Auth] ${method} ${path} | adminId: ${adminId ? adminId.substring(0, 8) + '...' : 'MISSING'} | hash: ${adminHash ? adminHash.substring(0, 8) + '...' : 'MISSING'}`);

    if (!adminId || !adminHash) {
      console.log(`[Auth] REJECTED: Missing headers`);
      return null;
    }

    const user = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'super_admin'] },
        adminPass: adminHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true,
      },
    });

    if (!user) {
      // Debug: check if user exists at all or if it's a role/hash mismatch
      const anyUser = await db.user.findUnique({ where: { id: adminId }, select: { id: true, role: true, adminPass: true } });
      if (anyUser) {
        console.log(`[Auth] REJECTED: User exists but mismatch | role: ${anyUser.role} | passMatch: ${anyUser.adminPass === adminHash}`);
      } else {
        console.log(`[Auth] REJECTED: User not found with id ${adminId}`);
      }
      return null;
    }

    console.log(`[Auth] OK: ${user.name} (${user.role})`);

    const permissions = JSON.parse(user.permissions || '{}');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
    };
  } catch (err) {
    console.error('[Auth] ERROR:', err);
    return null;
  }
}

/**
 * Middleware helper — call at the top of any admin-only API route handler.
 * Returns an error response if not admin, or null if authorized.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak. Hanya admin yang bisa melakukan tindakan ini.' },
      { status: 401 },
    );
  }
  return null;
}
