import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in with Google using Firebase Auth popup
 * Stores the contributor account & login info into Firestore `users` collection
 */
export async function signInWithGoogle(): Promise<{ user: UserProfile; firebaseUser: FirebaseUser }> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  const now = new Date().toISOString();
  const loginName = fbUser.email ? fbUser.email.split('@')[0] : `user-${fbUser.uid.slice(0, 6)}`;

  const userDocRef = doc(db, 'users', fbUser.uid);
  const existingSnap = await getDoc(userDocRef);

  let profile: UserProfile;

  if (existingSnap.exists()) {
    const data = existingSnap.data() as UserProfile;
    profile = {
      ...data,
      id: fbUser.uid,
      googleUid: fbUser.uid,
      name: fbUser.displayName || data.name || loginName,
      email: fbUser.email || data.email || '',
      avatarUrl: fbUser.photoURL || data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      lastLoginAt: now,
      provider: 'google',
      loginHistory: [
        ...(data.loginHistory || []),
        {
          timestamp: now,
          provider: 'google',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
        },
      ].slice(-10), // keep latest 10 login events
    };
    await setDoc(userDocRef, profile, { merge: true });
  } else {
    profile = {
      id: fbUser.uid,
      googleUid: fbUser.uid,
      login: loginName,
      name: fbUser.displayName || loginName,
      email: fbUser.email || '',
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      htmlUrl: `https://github.com/${loginName}`,
      provider: 'google',
      role: 'contributor',
      bio: 'CDRCA Animation DSL Ecosystem Contributor',
      links: {
        website: '',
        github: `https://github.com/${loginName}`,
        docs: '',
        twitter: '',
      },
      publishedPackages: [],
      createdAt: now,
      lastLoginAt: now,
      loginHistory: [
        {
          timestamp: now,
          provider: 'google',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
        },
      ],
    };
    await setDoc(userDocRef, profile);
  }

  // Also synchronize with backend session so CLI and API can authenticate
  try {
    await fetch('/api/auth/google-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: profile }),
    });
  } catch (e) {
    console.warn('Backend google-sync notice:', e);
  }

  return { user: profile, firebaseUser: fbUser };
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
 * Store or update contributor login information into Firestore `users` collection
 */
export async function recordUserLoginInFirestore(user: UserProfile, provider: 'google' | 'github' | 'sandbox' = 'google'): Promise<void> {
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
        provider: provider,
        loginHistory: [
          ...(existing.loginHistory || []),
          {
            timestamp: now,
            provider,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
          },
        ].slice(-10),
      };
      await updateDoc(userDocRef, updated);
    } else {
      const newProfile: UserProfile = {
        ...user,
        provider,
        role: user.role || 'contributor',
        links: user.links || {
          github: user.htmlUrl || `https://github.com/${user.login}`,
          website: '',
          docs: '',
        },
        publishedPackages: user.publishedPackages || [],
        createdAt: user.createdAt || now,
        lastLoginAt: now,
        loginHistory: [
          {
            timestamp: now,
            provider,
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
    documentation: `https://github.com/Muhammad-Ayyan-no1/${pkg.name}#readme`,
    demo: `https://cdrca.dev/playground?pkg=${pkg.name}`,
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
    await fetch(`/api/packages/${encodeURIComponent(pkgName)}/links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    await fetch(`/api/packages/${encodeURIComponent(pkgName)}/readme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

/**
 * Seeds initial libraries in Firestore if empty
 */
export async function seedFirestoreLibrariesIfEmpty(initialPackages: Record<string, PackageRecord>): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'packages'));
    if (snap.size === 0) {
      console.log('Seeding initial CDRCA libraries into Firestore database...');
      for (const [name, pkg] of Object.entries(initialPackages)) {
        await savePackageToFirestore(pkg);
      }
      console.log('Firestore libraries seeded successfully.');
    }
  } catch (err) {
    console.warn('Notice while checking/seeding Firestore libraries:', err);
  }
}
