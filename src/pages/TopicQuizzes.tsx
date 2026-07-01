import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { publicVocabulary, publicPhrases, publicArticles } from "../lib/public-data";
import { useAuth } from "../AuthContext";
import { signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useCloudVocabulary } from "../lib/firestore";

export default function TopicQuizzes() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const userVocabulary = useCloudVocabulary(user?.uid);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default');

  useEffect(() => {
    // Load the scores so we can display the checkmarks
    setScores(JSON.parse(localStorage.getItem('micalingo_guest_scores') || '{}'));
  }, []);

  // Redirect logged-in users to /import if they want a custom quiz but have no vocabulary yet
  useEffect(() => {
    if (activeTab === 'custom' && user && userVocabulary?.length === 0) {
      navigate('/import');
    }
  }, [activeTab, user, userVocabulary, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to log in with Google.");
    }
  };

  let sourceData: any[] = [];
  let pageTitle = "";

  // Map the URL topic to the correct database
  if (topic === 'vocabulary') {
    sourceData = publicVocabulary;
    pageTitle = "Vocabulary";
  } else if (topic === 'phrases') {
    sourceData = publicPhrases;
    pageTitle = "Phrases";
  } else if (topic === 'articles') {
    sourceData = publicArticles;
    pageTitle = "Articles";
  } else {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-800">Topic not found</h1>
        <button onClick={() => navigate('/practice')} className="mt-4 text-blue-600 hover:underline">Return to Practice</button>
      </div>
    );
  }

  // Calculate how many 20-word quizzes exist for this topic
  const WORDS_PER_QUIZ = 20;
  const totalQuizzes = Math.ceil(sourceData.length / WORDS_PER_QUIZ);
  const quizzes = Array.from({ length: totalQuizzes }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/practice')} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold">{pageTitle} Quizzes</h1>
          <p className="text-gray-600 mt-1">Select a level to start practicing.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('default')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'default' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Open Library
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'custom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Personalized Space
        </button>
      </div>

      {/* Tab Content: Default Quizzes */}
      {activeTab === 'default' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col gap-3">
            {quizzes.map((quizId) => {
              const score = scores[`${topic}_${quizId}`];
              const isFinished = score !== undefined;
              
              // Calculate exactly how many items are in this specific quiz (in case the last one has fewer than 20)
              const itemsInThisQuiz = quizId === totalQuizzes && sourceData.length % WORDS_PER_QUIZ !== 0 
                ? sourceData.length % WORDS_PER_QUIZ 
                : WORDS_PER_QUIZ;
              
              const isPerfect = score === itemsInThisQuiz;

              return (
                <Link
                  key={quizId}
                  to={`/quiz?topic=${topic}&quizId=${quizId}`}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isPerfect ? "bg-green-50 border-green-500 hover:bg-green-100" : "bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-white shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                      isPerfect ? "bg-green-500 text-white" : "bg-white text-blue-600 border border-blue-100"
                    }`}>
                      {quizId}
                    </div>
                    <div>
                      <span className={`block font-bold text-lg ${isPerfect ? 'text-green-900' : 'text-gray-800'}`}>Level {quizId}</span>
                      <span className={`text-sm ${isPerfect ? 'text-green-700' : 'text-gray-500'}`}>
                        {itemsInThisQuiz} items
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isFinished && (
                      <span className={`font-bold text-lg ${isPerfect ? 'text-green-700' : 'text-gray-600'}`}>
                        {score} / {itemsInThisQuiz}
                      </span>
                    )}
                    {isPerfect ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    ) : (
                      <span className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">Start →</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content: Custom Quizzes */}
      {activeTab === 'custom' && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
          {loading ? (
            <p className="text-gray-500">Checking account...</p>
          ) : !user ? (
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Personalized Quizzes</h2>
              <p className="text-gray-600 mb-8">
                Log in to create your own practice sessions. You can import vocabulary from Excel or text files and test yourself immediately!
              </p>
              <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Log in with Google
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Custom Quizzes</h2>
              <p className="text-gray-600">You currently have <span className="font-bold text-blue-600">{userVocabulary?.length || 0}</span> items saved in your learning database.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => navigate('/quiz')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-blue-700 transition-colors">Start Custom Quiz</button>
                <button onClick={() => navigate('/import')} className="bg-white text-blue-600 border border-blue-200 font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-blue-50 transition-colors">Import More Data</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}