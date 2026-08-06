import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { completeGoogleRedirectSignIn, signOutFromApp } from './lib/googleAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminMode: boolean;
  setAdminMode: (mode: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  adminMode: false,
  setAdminMode: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminModeState] = useState<boolean>(() => sessionStorage.getItem("micalingo_admin_mode") === "true");

  const adminEmails = ['esztergalyos.ildiko@gmail.com', 'ildiko.esztergalyos@gmail.com'];
  const isAdmin = user?.email ? adminEmails.includes(user.email) : false;

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      // Finish redirect-based Google sign-in (used on Firefox / popup fallback)
      // before subscribing so AuthContext sees the user on return.
      try {
        await completeGoogleRedirectSignIn();
      } catch (error) {
        console.error('Google redirect sign-in failed:', error);
      }
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  
  const setAdminMode = (isDevMode: boolean) => {
    setAdminModeState(isDevMode);
    sessionStorage.setItem("micalingo_admin_mode", isDevMode ? "true" : "false");
  };

  const signOut = async () => {
    sessionStorage.removeItem("adminPromptShown");
    sessionStorage.removeItem("micalingo_admin_mode");
    setAdminModeState(false);
    await signOutFromApp();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminMode, setAdminMode, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);