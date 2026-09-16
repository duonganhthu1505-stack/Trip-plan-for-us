import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';

import bundledConfig from '../firebase-applet-config.json';

// Suppress benign connection timeout & quota backoff warnings
setLogLevel('silent');

/**
 * The bundled firebase-applet-config.json is the default backend.
 * Each value can be overridden at build time with a Netlify environment variable so the
 * app can be pointed at the correct Firestore project / named database without a code change.
 *
 * IMPORTANT: VITE_FIRESTORE_DATABASE_ID must be set when the project uses a *named*
 * Firestore database instead of "(default)". If it is missing, the SDK talks to
 * "(default)", and every read/write/onSnapshot fails with NOT_FOUND, which silently
 * disables all cross-device synchronisation.
 */
const env = (import.meta as any).env || {};

function pick(envValue: unknown, fallback: unknown): any {
  return typeof envValue === 'string' && envValue.trim().length > 0 ? envValue.trim() : fallback;
}

const bundled = bundledConfig as Record<string, any>;

const firebaseConfig = {
  apiKey: pick(env.VITE_FIREBASE_API_KEY, bundled.apiKey),
  authDomain: pick(env.VITE_FIREBASE_AUTH_DOMAIN, bundled.authDomain),
  projectId: pick(env.VITE_FIREBASE_PROJECT_ID, bundled.projectId),
  storageBucket: pick(env.VITE_FIREBASE_STORAGE_BUCKET, bundled.storageBucket),
  messagingSenderId: pick(env.VITE_FIREBASE_MESSAGING_SENDER_ID, bundled.messagingSenderId),
  appId: pick(env.VITE_FIREBASE_APP_ID, bundled.appId),
  measurementId: pick(env.VITE_FIREBASE_MEASUREMENT_ID, bundled.measurementId),
};

export const firestoreDatabaseId: string | undefined = pick(
  env.VITE_FIRESTORE_DATABASE_ID,
  bundled.firestoreDatabaseId
);

export const firestoreProjectId: string = firebaseConfig.projectId;

const app = initializeApp(firebaseConfig);

// Use long-polling transport and persistent multi-tab cache to prevent 10s backend stream timeouts on mobile/iframe
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalForceLongPolling: true,
  },
  firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Optional connection helper
export async function testConnection(): Promise<boolean> {
  return true;
}

export { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword };

