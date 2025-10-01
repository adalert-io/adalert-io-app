import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

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

export async function GET(_req: NextRequest) {
  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { error: 'Admin not configured', users: [], total: 0 },
      { status: 200 },
    );
  }

  const db = admin.firestore(app);

  try {
    const snap = await db.collection('users').get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ users, total: users.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


