import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App | null {
  try {
    if (admin.apps.length) return admin.apps[0]!;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    return adminApp;
  } catch (e) {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { error: 'Admin not configured' },
      { status: 500 },
    );
  }

  try {
    const { uid } = await req.json();
    
    if (!uid) {
      return NextResponse.json(
        { error: 'UID is required' },
        { status: 400 },
      );
    }

    const auth = admin.auth(app);
    await auth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error deleting auth user:', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete auth user' }, { status: 500 });
  }
}
