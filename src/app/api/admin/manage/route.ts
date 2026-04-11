import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { requireAdmin, verifyAdmin } from '@/lib/admin-guard';

// Helper to hash password
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// POST - Create new admin (requires admin auth)
export async function POST(request: NextRequest) {
  // Auth guard — only authenticated admins can create new admins
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 401 });
  }

  // Only super_admin can create new admins
  if (admin.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Hanya super admin yang bisa membuat admin baru' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, role, permissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Nama, email, dan password wajib diisi',
      }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Email sudah terdaftar',
      }, { status: 400 });
    }

    // Prevent creating super_admin unless the creator is super_admin
    const newRole = role === 'super_admin' ? 'super_admin' : 'admin';

    // Create new admin
    const newAdmin = await db.user.create({
      data: {
        name,
        email,
        adminPass: hashPassword(password),
        role: newRole,
        permissions: JSON.stringify(permissions || {}),
        isAdmin: true,
        gender: 'male',
        tier: 'B',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        avatar: true,
        createdAt: true,
      },
    });

    console.log(`[Admin] "${admin.name}" created new admin "${name}" (${newRole})`);

    return NextResponse.json({
      success: true,
      admin: {
        ...newAdmin,
        permissions: JSON.parse(newAdmin.permissions || '{}'),
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat admin baru' },
      { status: 500 },
    );
  }
}

// PUT - Update admin (requires admin auth)
export async function PUT(request: NextRequest) {
  // Auth guard
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { adminId, name, email, password, role, permissions } = body;

    if (!adminId) {
      return NextResponse.json({
        success: false,
        error: 'Admin ID wajib diisi',
      }, { status: 400 });
    }

    // Check if target admin exists and is actually an admin
    const targetAdmin = await db.user.findFirst({
      where: { id: adminId, role: { in: ['admin', 'super_admin'] } },
    });

    if (!targetAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin tidak ditemukan' },
        { status: 404 },
      );
    }

    // Only super_admin can:
    // - Change roles (promote/demote)
    // - Modify other super_admins
    // - Modify permissions
    if (admin.role !== 'super_admin') {
      // Regular admin can only update their own profile
      if (admin.id !== adminId) {
        return NextResponse.json(
          { success: false, error: 'Admin biasa hanya bisa mengubah profil sendiri' },
          { status: 403 },
        );
      }
      // Regular admin cannot change their own role or permissions
      if (role || permissions !== undefined) {
        return NextResponse.json(
          { success: false, error: 'Tidak bisa mengubah role atau permissions sendiri' },
          { status: 403 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.adminPass = hashPassword(password);
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);

    const updatedAdmin = await db.user.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        avatar: true,
        createdAt: true,
      },
    });

    console.log(`[Admin] "${admin.name}" updated admin "${updatedAdmin.name}"`);

    return NextResponse.json({
      success: true,
      admin: {
        ...updatedAdmin,
        permissions: JSON.parse(updatedAdmin.permissions || '{}'),
      },
    });
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengupdate admin' },
      { status: 500 },
    );
  }
}

// DELETE - Delete admin (requires super_admin)
export async function DELETE(request: NextRequest) {
  // Auth guard
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 401 });
  }

  // Only super_admin can delete admins
  if (admin.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Hanya super admin yang bisa menghapus admin' },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({
        success: false,
        error: 'Admin ID wajib diisi',
      }, { status: 400 });
    }

    // Cannot delete yourself
    if (admin.id === adminId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 },
      );
    }

    // Don't allow deleting the last super_admin
    const targetAdmin = await db.user.findUnique({
      where: { id: adminId },
    });

    if (targetAdmin?.role === 'super_admin') {
      const superAdminCount = await db.user.count({
        where: { role: 'super_admin' },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Tidak dapat menghapus super admin terakhir' },
          { status: 400 },
        );
      }
    }

    await db.user.delete({
      where: { id: adminId },
    });

    console.log(`[Admin] "${admin.name}" deleted admin "${targetAdmin?.name}" (${adminId})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus admin' },
      { status: 500 },
    );
  }
}
