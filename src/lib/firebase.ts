import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getAuth,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { UserProfile, PackageRecord, LibraryLinks } from '../types';

// Load config from firebase-applet-config.json
import configData from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: configData.projectId,
  appId: configData.appId,
  apiKey: configData.apiKey,
  authDomain: configData.authDomain,
  firestoreDatabaseId: configData.firestoreDatabaseId,
  storageBucket: configData.storageBucket,
  messagingSenderId: configData.messagingSenderId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the provisioned database ID
export const db = configData.firestoreDatabaseId
  ? getFirestore(app, configData.firestoreDatabaseId)
  : getFirestore(app);

// Connection test on boot per Firebase guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

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

/**
 * Sign out of Firebase and backend session
 */
export async function signOutContributor(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Firebase signout warning:', e);
  }
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Backend logout warning:', e);
  }
}

/**
 * Store or update contributor login information into Firestore `users` collection for verified GitHub contributors
 */
export async function recordUserLoginInFirestore(user: UserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.id);
    const existingSnap = await getDoc(userDocRef);
    const now = new Date().toISOString();

    if (existingSnap.exists()) {
      const existing = existingSnap.data() as UserProfile;
      const updated: Partial<UserProfile> = {
        name: user.name || existing.name,
        login: user.login || existing.login,
        avatarUrl: user.avatarUrl || existing.avatarUrl,
        lastLoginAt: now,
        provider: 'github',
        loginHistory: [
          ...(existing.loginHistory || []),
          {
            timestamp: now,
            provider: 'github',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
          },
        ].slice(-10),
      };
      await updateDoc(userDocRef, updated);
    } else {
      const newProfile: UserProfile = {
        ...user,
        provider: 'github',
        role: user.role || 'contributor',
        links: user.links || {
          github: user.htmlUrl || `https://github.com/${user.login}`,
          website: '',
          docs: '',
          twitter: '',
        },
        publishedPackages: user.publishedPackages || [],
        createdAt: user.createdAt || now,
        lastLoginAt: now,
        loginHistory: [
          {
            timestamp: now,
            provider: 'github',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
          },
        ],
      };
      await setDoc(userDocRef, newProfile);
    }
  } catch (err) {
    console.warn('Could not record user login in Firestore:', err);
  }
}

/**
 * Update contributor profile details and links in Firestore
 */
export async function updateContributorProfileInFirestore(userId: string, data: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, data, { merge: true });
}

/**
 * Fetch a single contributor's profile from Firestore
 */
export async function getContributorProfileFromFirestore(userIdOrLogin: string): Promise<UserProfile | null> {
  try {
    // Check by doc ID
    const directDoc = await getDoc(doc(db, 'users', userIdOrLogin));
    if (directDoc.exists()) {
      return directDoc.data() as UserProfile;
    }

    // Otherwise query by login handle
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const user = docSnap.data() as UserProfile;
      if (user.login?.toLowerCase() === userIdOrLogin.toLowerCase()) {
        return user;
      }
    }
    return null;
  } catch (err) {
    console.warn('Error fetching contributor from Firestore:', err);
    return null;
  }
}

/**
 * Fetch all registered contributors from Firestore
 */
export async function getAllContributorsFromFirestore(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const contributors: UserProfile[] = [];
    snap.forEach((docSnap) => {
      contributors.push(docSnap.data() as UserProfile);
    });
    return contributors;
  } catch (err) {
    console.warn('Error fetching all contributors:', err);
    return [];
  }
}

// -------------------------------------------------------------
// Packages & Library Documentation & Links in Firestore
// -------------------------------------------------------------

/**
 * Save a package record into Firestore `packages` collection
 */
export async function savePackageToFirestore(pkg: PackageRecord): Promise<void> {
  const pkgDocRef = doc(db, 'packages', pkg.name.toLowerCase());
  // Ensure default library links are present
  const links: LibraryLinks = pkg.links || {
    repository: pkg.repository,
    documentation: `${pkg.repository}#readme`,
    demo: '',
    homepage: pkg.repository,
    issues: `${pkg.repository}/issues`,
  };

  const payload: PackageRecord = {
    ...pkg,
    links,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(pkgDocRef, payload, { merge: true });
}

/**
 * Update library links in Firestore (docs, demo, repository, homepage, issues)
 */
export async function updateLibraryLinksInFirestore(pkgName: string, links: LibraryLinks): Promise<void> {
  const pkgDocRef = doc(db, 'packages', pkgName.toLowerCase());
  await setDoc(pkgDocRef, { links, updatedAt: new Date().toISOString() }, { merge: true });

  // Also sync with backend API
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cdrca_session_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`/api/packages/${encodeURIComponent(pkgName)}/links`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ links }),
    });
  } catch (e) {
    console.warn('Backend links sync warning:', e);
  }
}

/**
 * Update library README documentation in Firestore
 */
export async function updateLibraryReadmeInFirestore(pkgName: string, readme: string): Promise<void> {
  const pkgDocRef = doc(db, 'packages', pkgName.toLowerCase());
  await setDoc(pkgDocRef, { readme, updatedAt: new Date().toISOString() }, { merge: true });

  // Also sync with backend API
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cdrca_session_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`/api/packages/${encodeURIComponent(pkgName)}/readme`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ readme }),
    });
  } catch (e) {
    console.warn('Backend readme sync warning:', e);
  }
}

/**
 * Fetch all packages directly from Firestore
 */
export async function getAllPackagesFromFirestore(): Promise<PackageRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'packages'));
    const packages: PackageRecord[] = [];
    snap.forEach((docSnap) => {
      packages.push(docSnap.data() as PackageRecord);
    });
    return packages;
  } catch (err) {
    console.warn('Error fetching packages from Firestore:', err);
    return [];
  }
}

/**
 * Fetch single package by name from Firestore
 */
export async function getPackageFromFirestore(name: string): Promise<PackageRecord | null> {
  try {
    const docSnap = await getDoc(doc(db, 'packages', name.toLowerCase()));
    if (docSnap.exists()) {
      return docSnap.data() as PackageRecord;
    }
    return null;
  } catch (err) {
    console.warn(`Error fetching package "${name}" from Firestore:`, err);
    return null;
  }
}

const LEGACY_DUMMY_PACKAGES = [
  'calculastic',
  'vectorial-core',
  'gl-transpiler-hook',
  'pendulum-sim',
  'font-vectorizer',
  'mpd-streamer',
];

/**
 * Purges any legacy mock/dummy packages from Firestore so the registry is 100% genuine
 */
export async function purgeDummyPackagesFromFirestore(): Promise<void> {
  try {
    for (const name of LEGACY_DUMMY_PACKAGES) {
      const docRef = doc(db, 'packages', name);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await deleteDoc(docRef);
        console.log(`Purged legacy dummy package "${name}" from Firestore`);
      }
    }
  } catch (err) {
    console.warn('Notice while cleaning legacy dummy packages from Firestore:', err);
  }
}

// Automatically trigger dummy purge on initialization
purgeDummyPackagesFromFirestore();

