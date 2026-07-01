import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Quizzes() {
  const { user, loading } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to log in with Google.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quizzes</h1>
        <p className="text-gray-600 mt-1">Practise or create your own quizzes</p>
      </div>

      {/* Public Quizzes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Test Your Knowledge</h2>
        <p className="text-sm text-gray-600 mb-4">Try these pre-made quizzes to practice common words, phrases, articles. Available for everyone!</p>
        <Link to="/practice" className="inline-block bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg shadow hover:bg-blue-700 transition-colors">
          Start General Practice
        </Link>
      </div>

      {/* Personalized Quizzes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Create Your Own Quizzes</h2>
        {user ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">Use your own imported vocabulary to generate personalized quizzes.</p>
            <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">Coming soon</div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">Log in to create quizzes from your own vocabulary, track your results, and save your progress across devices.</p>
            <button onClick={handleGoogleLogin} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 font-bold px-5 py-2.5 rounded-lg shadow-sm hover:bg-gray-200 transition-colors border border-gray-200">
              Log in to Create Quizzes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}