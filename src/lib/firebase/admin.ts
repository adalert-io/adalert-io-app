import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

function getPrivateKey(): string | undefined {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey) return undefined;
  return privateKey.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): admin.app.App | null {
  if (admin.apps.length) return admin.apps[0]!;
  if (adminApp) return adminApp;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) return null;

  adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });

  return adminApp;
}

export function requireFirebaseAdminApp(): admin.app.App {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error("Firebase Admin not configured");
  }
  return app;
}

export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(requireFirebaseAdminApp());
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore(requireFirebaseAdminApp());
}

export function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function verifyFirebaseIdToken(authorizationHeader: string | null) {
  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    const error = new Error("Missing Authorization Bearer token");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch {
    const error = new Error("Invalid or expired token");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
}
