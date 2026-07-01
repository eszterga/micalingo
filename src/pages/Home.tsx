import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCloudVocabulary } from '../lib/firestore';

export default function Home() {
  const { user } = useAuth();
  const allWords = useCloudVocabulary(user?.uid);
  
  const wordCount = allWords?.length || 0;
  const recentWords = allWords ? [...allWords].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 3) : [];

  return (
    <div className="space-y-6">
  {/* Header */}
  <div>
    <h1 className="text-3xl font-bold">Welcome back 👋</h1>
    <p className="text-gray-600 mt-1">
      Ready to continue your learning?
    </p>
  </div>

  {/* Primary Action */}
  <div className="bg-blue-600 text-white p-6 rounded-xl shadow">
    <h2 className="text-xl font-bold mb-2">Start Learning</h2>
    <p className="text-blue-100 mb-4">
      Continue practicing or start a new quiz session.
    </p>
    <Link
      to="/quiz"
      className="inline-block bg-white text-blue-600 font-bold px-4 py-2 rounded shadow hover:bg-gray-50 transition-colors"
    >
      Start Practice
    </Link>
  </div>

  {/* Secondary Actions */}
  <div className="grid md:grid-cols-2 gap-4">

    <Link to="/import" className="p-4 bg-white rounded shadow hover:shadow-md border-l-4 border-green-500">
      <h3 className="font-bold">Import Data</h3>
      <div className="text-sm text-gray-600 mt-1">
        Upload new learning materials
        {!user && (
          <span className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            (log in required)
          </span>
        )}
      </div>
    </Link>

    <Link to="/quizzes" className="p-4 bg-white rounded shadow hover:shadow-md">
      <h3 className="font-bold">Quizzes</h3>
      <div className="text-sm text-gray-600 mt-1">
        Manage your learning sets
        {!user && (
          <span className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            (to create new quizzes, log in required)
          </span>
        )}
      </div>
    </Link>

    <Link to="/vocabulary" className="p-4 bg-white rounded shadow hover:shadow-md">
      <h3 className="font-bold">Vocabulary</h3>
      <div className="text-sm text-gray-600 mt-1">
        Learn new words and phrases
        {!user && (
          <span className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            (for extending, log in required)
          </span>
        )}
      </div>
    </Link>

    <Link to="/grammar" className="p-4 bg-white rounded shadow hover:shadow-md">
      <h3 className="font-bold">Grammar</h3>
      <p className="text-sm text-gray-600">Review grammar topics</p>
    </Link>

    <Link to="/statistics" className="p-4 bg-white rounded shadow hover:shadow-md">
      <h3 className="font-bold">Statistics</h3>
      <p className="text-sm text-gray-600">Track your progress</p>
    </Link>

  </div>

      {/* Real-time Stats & Recent Imports */}
      <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Your Progress</h3>
            <p className="text-sm text-gray-600 mt-1">You have <span className="font-bold text-blue-600">{wordCount ?? 0}</span> items saved in your learning database.</p>
          </div>
        </div>

        {recentWords && recentWords.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recently Added</h4>
            <ul className="space-y-2">
              {recentWords.map(word => (
                <li key={word.id} className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 text-sm flex justify-between items-center">
                  <span className="font-bold text-gray-800">{word.german}</span>
                  <span className="text-gray-500">{word.hungarian}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}