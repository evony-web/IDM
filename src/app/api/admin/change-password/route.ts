import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { requireAdmin } from '@/lib/admin-guard';

// PUT - Change admin password
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Username, password lama, dan password baru wajib diisi' },
        { status: 400 },
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 4 karakter' },
        { status: 400 },
      );
    }

    if (newPassword.length > 64) {
      return NextResponse.json(
        { success: false, error: 'Password baru maksimal 64 karakter' },
        { status: 400 },
      );
    }

    // Hash the current password to compare
    const currentHash = createHash('sha256').update(currentPassword).digest('hex');

    // Find the admin user
    const user = await db.user.findFirst({
      where: {
        name: username.trim(),
        role: { in: ['admin', 'super_admin'] },
        adminPass: currentHash,
      },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password lama salah' },
        { status: 401 },
      );
    }

    // Hash new password and update
    const newHash = createHash('sha256').update(newPassword).digest('hex');
    await db.user.update({
      where: { id: user.id },
      data: { adminPass: newHash },
    });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah password' },
      { status: 500 },
    );
  }
}
