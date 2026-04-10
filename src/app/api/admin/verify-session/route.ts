import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Verify admin session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json({ 
        success: false, 
        valid: false,
        authenticated: false,
        error: 'Admin ID tidak ditemukan' 
      }, { status: 401 });
    }

    // Verify admin still exists and has admin role
    const admin = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'super_admin'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        avatar: true,
        tier: true,
      }
    });

    if (!admin) {
      return NextResponse.json({ 
        success: false, 
        valid: false,
        authenticated: false,
        error: 'Sesi tidak valid' 
      }, { status: 401 });
    }

    const permissions = JSON.parse(admin.permissions || '{}');

    return NextResponse.json({
      success: true,
      valid: true,
      authenticated: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions,
        avatar: admin.avatar,
        tier: admin.tier,
      }
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json({ 
      success: false, 
      valid: false,
      authenticated: false,
      error: 'Gagal memverifikasi sesi' 
    }, { status: 500 });
  }
}
