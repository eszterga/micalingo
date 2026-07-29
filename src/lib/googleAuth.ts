import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Signs the user in with their Google account.
 *
 * Web: Firebase Auth popup.
 *
 * Native app: Google blocks OAuth inside the WebView ("disallowed_useragent").
 * We use the device's native Google Sign-In UI, then pass the ID token into
 * the Firebase JS SDK (which AuthContext / Firestore actually use). Without
 * that second step, the account picker succeeds but the app stays logged out.
 */
export async function signInWithGoogle(): Promise<UserCredential | void> {
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
  return signInWithPopup(auth, provider);
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
