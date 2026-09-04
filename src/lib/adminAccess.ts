import type { User } from 'firebase/auth';

/** Google accounts that can see the private Telc B2 quiz section (web + native app). */
export const ADMIN_EMAILS = [
  'esztergalyos.ildiko@gmail.com',
  'ildiko.esztergalyos@gmail.com',
] as const;

export const NATIVE_EMAIL_STORAGE_KEY = 'micalingo_native_email';

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function isAdminEmail(email?: string | null): boolean {
  return (ADMIN_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

/** Firebase JS user.email can be empty after native Google Sign-In; providerData still has it. */
export function emailFromFirebaseUser(user: User | null | undefined): string {
  if (!user) return '';
  const direct = normalizeEmail(user.email);
  if (direct) return direct;
  for (const profile of user.providerData || []) {
    const fromProvider = normalizeEmail(profile.email);
    if (fromProvider) return fromProvider;
  }
  return '';
}

export function readStoredNativeEmail(): string {
  try {
    return normalizeEmail(sessionStorage.getItem(NATIVE_EMAIL_STORAGE_KEY));
  } catch {
    return '';
  }
}

export function storeNativeEmail(email?: string | null) {
  const value = normalizeEmail(email);
  try {
    if (value) sessionStorage.setItem(NATIVE_EMAIL_STORAGE_KEY, value);
    else sessionStorage.removeItem(NATIVE_EMAIL_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
