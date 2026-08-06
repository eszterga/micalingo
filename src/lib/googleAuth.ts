import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthError,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

/** True when the user dismissed the Google popup (not a real failure). */
export function isUserCancelledAuthError(error: unknown): boolean {
  return isAuthErrorCode(error, 'auth/popup-closed-by-user');
}

function isAuthErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as AuthError).code === code
  );
}

function prefersRedirectSignIn(): boolean {
  // Firefox Enhanced Tracking / Fingerprinting Protection often breaks the
  // cross-origin Firebase auth popup (authDomain is *.firebaseapp.com while
  // the app runs on micalingo.com). Full-page redirect is reliable there.
  return /firefox/i.test(navigator.userAgent);
}

function shouldFallbackToRedirect(error: unknown): boolean {
  return (
    isAuthErrorCode(error, 'auth/popup-blocked') ||
    isAuthErrorCode(error, 'auth/cancelled-popup-request') ||
    isAuthErrorCode(error, 'auth/operation-not-supported-in-this-environment')
  );
}

/**
 * Completes a pending Google redirect sign-in, if any.
 * Must run once on app startup (see AuthContext).
 */
export async function completeGoogleRedirectSignIn(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

// Prevents overlapping popup/redirect attempts (double-clicks, remounts).
let pendingSignIn: Promise<UserCredential | null> | null = null;

/**
 * Signs the user in with their Google account.
 *
 * Web (Chrome/Safari/Edge): Firebase Auth popup, with redirect fallback
 * when the popup is blocked or cancelled by the browser.
 *
 * Web (Firefox): redirect flow — popups are unreliable with Firefox
 * tracking / fingerprinting protections against the Firebase auth domain.
 *
 * Native app: Google blocks OAuth inside the WebView ("disallowed_useragent").
 * We use the device's native Google Sign-In UI, then pass the ID token into
 * the Firebase JS SDK (which AuthContext / Firestore actually use). Without
 * that second step, the account picker succeeds but the app stays logged out.
 *
 * Returns null when a full-page redirect was started (caller must not navigate).
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (pendingSignIn) return pendingSignIn;

  pendingSignIn = (async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      return signInWithCredential(auth, credential);
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if (prefersRedirectSignIn()) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      return await signInWithPopup(auth, provider);
    } catch (error) {
      if (isUserCancelledAuthError(error)) {
        throw error;
      }
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw error;
    }
  })().finally(() => {
    pendingSignIn = null;
  });

  return pendingSignIn;
}

/** Signs out of both native Google/Firebase Auth and the Firebase JS SDK. */
export async function signOutFromApp(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch {
      // Still clear the JS session even if native sign-out fails.
    }
  }
  await signOut(auth);
}
