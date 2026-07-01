import { useEffect } from 'react';
import { signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Corrected path
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { user, loading } = useAuth(); // Corrected from previous version
  const navigate = useNavigate();

  useEffect(() => {
    // If the user is already logged in, redirect them to the home page.
    if (!loading && user) { // Corrected from previous version
      navigate('/');
    }
  }, [user, loading, navigate]); // Corrected from previous version

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Use redirect for all devices for maximum compatibility.
      // The page will reload after Google redirects back, and AuthContext will handle the user state.
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to log in with Google.");
    }
  };

  // While authenticating or if user is already logged in, show a loading state to prevent flicker. // Corrected from previous version
  if (loading || user) { // Corrected from previous version
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 w-full absolute inset-0">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 w-full absolute inset-0">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">MicaLingo</h1>
          <p className="text-gray-500 mt-2">Sign in to sync your learning progress.</p>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-3 bg-transparent text-gray-500 hover:text-gray-800 font-medium py-3 px-4 rounded-xl transition-all"
        >
          Continue as a guest
        </button>
      </div>
    </div>
  );
}