import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App | null {
  try {
    if (admin.apps.length) {
      console.log('Using existing admin app');
      return admin.apps[0]!;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('Initializing Firebase Admin with:', {
      projectId,
      clientEmail,
      privateKeyLength: privateKey?.length || 0
    });

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing Firebase Admin credentials:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      });
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
    
    console.log('Firebase Admin initialized successfully');
    return adminApp;
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
    return null;
  }
}

export async function GET(_req: NextRequest) {
  const app = getAdminApp();
  if (!app) {
    console.error('Admin app is null - check Firebase Admin configuration');
    return NextResponse.json(
      { error: 'Admin not configured', authUsers: [], firestoreUsers: [], total: 0 },
      { status: 200 },
    );
  }

  const db = admin.firestore(app);
  const auth = admin.auth(app);

  try {
    // Get Firebase Auth users
    let authUsers: any[] = [];
    try {
      const authResult = await auth.listUsers();
      authUsers = authResult.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
        providerData: user.providerData,
      }));
    } catch (authError) {
      console.warn('Failed to fetch auth users:', authError);
    }

    // Get Firestore users
    let firestoreUsers: any[] = [];
    try {
      const snap = await db.collection('users').get();
      firestoreUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (firestoreError) {
      console.warn('Failed to fetch firestore users:', firestoreError);
    }

    return NextResponse.json({ 
      authUsers, 
      firestoreUsers, 
      authTotal: authUsers.length,
      firestoreTotal: firestoreUsers.length,
      total: authUsers.length + firestoreUsers.length 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


