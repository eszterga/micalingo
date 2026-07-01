import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

export default function Statistics() {
  const { user } = useAuth();
  const [guestScores, setGuestScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setGuestScores(JSON.parse(localStorage.getItem('micalingo_guest_scores') || '{}'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statistics</h1>
        <p className="text-gray-600 mt-1">Track your progress over time.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quiz History</h2>
        
        {user ? (
           <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">Cloud statistics coming soon!</div>
        ) : Object.keys(guestScores).length === 0 ? (
          <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">Complete some general practice quizzes to see your scores here.</div>
        ) : (
          <ul className="space-y-3">
            {Object.entries(guestScores).map(([quizKey, score]) => (
              <li key={quizKey} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-semibold text-gray-700 capitalize">{quizKey.replace('_', ' Level ')}</span>
                <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{score} / 20</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}