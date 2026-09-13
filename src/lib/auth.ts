import { UserProfile } from '../types';
import { signOutContributor, recordUserLoginInFirestore } from './firebase';

const TOKEN_KEY = 'cdrca_session_token';
const USER_KEY = 'cdrca_user_profile';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn('Failed to save session token to localStorage:', e);
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save user profile to localStorage:', e);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear auth storage:', e);
  }
}

/**
 * Authenticated Fetch wrapper:
 * Automatically includes `Authorization: Bearer <token>` from local storage
 * and passes credentials for iframe compatibility across all browser security policies.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const enhancedInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  const response = await fetch(input, enhancedInit);

  // If unauthorized and we had a stored token, the session expired
  if (response.status === 401 && token) {
    clearStoredAuth();
  }

  return response;
}

/**
 * Save logged in credentials locally and sync with Firestore database
 */
export async function persistUserSession(user: UserProfile, token: string): Promise<void> {
  setStoredToken(token);
  setStoredUser(user);

  try {
    await recordUserLoginInFirestore(user);
  } catch (err) {
    console.warn('Could not record user login in Firestore:', err);
  }
}

/**
 * Validates the current session against the server
 */
export async function syncCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) {
    const cachedUser = getStoredUser();
    if (cachedUser) clearStoredAuth();
    return null;
  }

  try {
    const res = await authFetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setStoredUser(data.user);
        if (data.token) {
          setStoredToken(data.token);
        }
        return data.user;
      }
    }
    // Token is invalid
    clearStoredAuth();
    return null;
  } catch (err) {
    console.error('Error syncing auth session:', err);
    // If offline or network error, fallback to cached user
    return getStoredUser();
  }
}

/**
 * Complete sign out across localStorage, backend sessions, and Firebase
 */
export async function performLogout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout request failed:', e);
  }

  try {
    await signOutContributor();
  } catch (e) {
    console.warn('Firebase signout failed:', e);
  }

  clearStoredAuth();
}
