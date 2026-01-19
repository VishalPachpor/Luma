import * as admin from 'firebase-admin';

// Validates the server-side firebase admin instance
// This is used for API routes to verify tokens and access Firestore with full privileges

if (!admin.apps.length) {
    try {
        // In local dev, we might accept mock credentials or rely on GOOGLE_APPLICATION_CREDENTIALS
        // For production, we must have service account env vars

        // Check for simplified env vars (Vercel style)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        } else {
            // Fallback to application default (good for GCP/Local with env var)
            // console.warn('⚠️ No explicit service account in env. using applicationDefault()');
            // admin.initializeApp({
            //     credential: admin.credential.applicationDefault()
            // });
            // VISHAL: Commented out applicationDefault to prevent crash when no creds are present
            console.warn('⚠️ Firebase Admin not initialized: Missing credentials');
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
