import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider, signInWithPopup, type UserCredential } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Signs the user in with their Google account.
 *
 * On the web, this opens the standard Firebase Auth popup.
 *
 * On the native Android/iOS app, Google actively blocks OAuth sign-in
 * attempts started inside an embedded WebView (the app's WebView is exactly
 * that). Attempting `signInWithPopup`/`signInWithRedirect` there fails with
 * "Error 400: disallowed_useragent" instead of showing the account picker.
 * To work around this we hand the sign-in off to the device's native Google
 * Sign-In flow via `@capacitor-firebase/authentication`, which also finishes
 * the sign-in on the Firebase JS SDK so `onAuthStateChanged` (see
 * `AuthContext`) fires as usual.
 */
export async function signInWithGoogle(): Promise<UserCredential | void> {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signInWithGoogle();
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}
