import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Payment settings keys
const PAYMENT_KEYS = [
  'bankName',
  'bankCode', 
  'bankNumber',
  'bankHolder',
  'gopayNumber',
  'gopayHolder',
  'ovoNumber',
  'ovoHolder',
  'danaNumber',
  'danaHolder',
  'qrisLabel',
  'qrisImage',
  'activeMethods',
  'qris_image_url',
  'payment_methods',
  'admin_contact',
];

// GET - Get payment settings
export async function GET() {
  try {
    const settings = await db.settings.findMany({
      where: {
        key: { in: PAYMENT_KEYS }
      }
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    // Parse activeMethods if exists
    let activeMethods = ['qris', 'transfer'];
    if (settingsMap.activeMethods) {
      try {
        activeMethods = JSON.parse(settingsMap.activeMethods);
      } catch {}
    } else if (settingsMap.payment_methods) {
      try {
        activeMethods = JSON.parse(settingsMap.payment_methods);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      settings: {
        bankName: settingsMap.bankName || 'Bank BCA',
        bankCode: settingsMap.bankCode || 'BCA',
        bankNumber: settingsMap.bankNumber || '',
        bankHolder: settingsMap.bankHolder || '',
        gopayNumber: settingsMap.gopayNumber || '',
        gopayHolder: settingsMap.gopayHolder || '',
        ovoNumber: settingsMap.ovoNumber || '',
        ovoHolder: settingsMap.ovoHolder || '',
        danaNumber: settingsMap.danaNumber || '',
        danaHolder: settingsMap.danaHolder || '',
        qrisLabel: settingsMap.qrisLabel || 'QRIS',
        qrisImage: settingsMap.qrisImage || settingsMap.qris_image_url || '',
        activeMethods,
        adminContact: settingsMap.admin_contact || null,
      }
    });
  } catch (error) {
    console.error('Payment settings error:', error);
    return NextResponse.json({
      success: true,
      settings: {
        bankName: 'Bank BCA',
        bankCode: 'BCA',
        bankNumber: '',
        bankHolder: '',
        gopayNumber: '',
        gopayHolder: '',
        ovoNumber: '',
        ovoHolder: '',
        danaNumber: '',
        danaHolder: '',
        qrisLabel: 'QRIS',
        qrisImage: '',
        activeMethods: ['qris', 'transfer'],
        adminContact: null,
      }
    });
  }
}

// PUT - Update payment settings (admin only)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Support both formats: { settings: {...} } and { bankName: ..., ... }
    const settings = body.settings || body;

    const fieldsToSave = [
      'bankName',
      'bankCode',
      'bankNumber', 
      'bankHolder',
      'gopayNumber',
      'gopayHolder',
      'ovoNumber',
      'ovoHolder',
      'danaNumber',
      'danaHolder',
      'qrisLabel',
      'qrisImage',
      'admin_contact',
    ];

    // Save each field
    for (const key of fieldsToSave) {
      if (settings[key] !== undefined) {
        await db.settings.upsert({
          where: { key },
          update: { value: String(settings[key] || '') },
          create: { key, value: String(settings[key] || '') }
        });
      }
    }

    // Handle activeMethods (array)
    if (settings.activeMethods !== undefined) {
      await db.settings.upsert({
        where: { key: 'activeMethods' },
        update: { value: JSON.stringify(settings.activeMethods) },
        create: { key: 'activeMethods', value: JSON.stringify(settings.activeMethods) }
      });
    }

    // Legacy support
    if (settings.qrisImageUrl !== undefined) {
      await db.settings.upsert({
        where: { key: 'qris_image_url' },
        update: { value: settings.qrisImageUrl || '' },
        create: { key: 'qris_image_url', value: settings.qrisImageUrl || '' }
      });
    }

    if (settings.paymentMethods !== undefined) {
      await db.settings.upsert({
        where: { key: 'payment_methods' },
        update: { value: JSON.stringify(settings.paymentMethods) },
        create: { key: 'payment_methods', value: JSON.stringify(settings.paymentMethods) }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update payment settings error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
