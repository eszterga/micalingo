import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useI18n } from "../I18nContext";
import { Link } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dbCloud } from "../lib/firebase";
import * as XLSX from 'xlsx';

const BackgroundBlobs = () => (
  <>
    <style>{`
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 15s infinite alternate; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
    `}</style>
    <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob pointer-events-none z-0"></div>
    <div className="fixed top-[10%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
    <div className="fixed bottom-[-10%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
  </>
);

export default function Statistics() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [history, setHistory] = useState<Record<string, any>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      if (user) {
        const historyKey = `micalingo_history_${user.uid}`;
        const scoreKey = `micalingo_scores_${user.uid}`;
        
        try {
          // Fetch from Cloud first
          const statsRef = doc(dbCloud, 'user_stats', user.uid);
          const snap = await getDoc(statsRef);
          
          let cloudHistory = {};
          let cloudScores = {};
          
          if (snap.exists()) {
            const data = snap.data();
            cloudHistory = data.history || {};
            cloudScores = data.scores || {};
          }
          
          // Also check localStorage for local changes
          let localHistory = JSON.parse(localStorage.getItem(historyKey) || '{}');
          let localScores = JSON.parse(localStorage.getItem(scoreKey) || '{}');
          
          // Merge: Cloud data + local data (local takes priority if both exist)
          const mergedHistory = { ...cloudHistory, ...localHistory };
          const mergedScores = { ...cloudScores, ...localScores };
          
          // Update localStorage with merged data
          localStorage.setItem(historyKey, JSON.stringify(mergedHistory));
          localStorage.setItem(scoreKey, JSON.stringify(mergedScores));
          
          // Rebuild history from scores to ensure consistency
          const historyFromScores: Record<string, any> = {};
          for (const [quizKey, score] of Object.entries(mergedScores)) {
            if (mergedHistory[quizKey]) {
              historyFromScores[quizKey] = mergedHistory[quizKey];
            } else {
              // If we have a score but no detailed history, create a minimal entry
              historyFromScores[quizKey] = {
                score,
                questions: [],
                userAnswers: []
              };
            }
          }
          
          setHistory(historyFromScores);
        } catch (error) {
          console.error("Error fetching cloud stats:", error);
          // Fallback to localStorage only
          const localHistory = JSON.parse(localStorage.getItem(historyKey) || '{}');
          setHistory(localHistory);
        }
      } else {
        // Guest user - use localStorage only
        const guestHistory = JSON.parse(localStorage.getItem('micalingo_guest_history') || '{}');
        setHistory(guestHistory);
      }
      
      setLoading(false);
    };

    fetchStats();
  }, [user?.uid]);

  const toggleSelection = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    if (!confirm(t('confirm_bulk_delete_records', { count: selectedKeys.size }) || "Are you sure?")) return;

    const historyKey = user ? `micalingo_history_${user.uid}` : 'micalingo_guest_history';
    const scoreKey = user ? `micalingo_scores_${user.uid}` : 'micalingo_guest_scores';
    
    const newHistory = { ...history };
    const scores = JSON.parse(localStorage.getItem(scoreKey) || '{}');
    
    selectedKeys.forEach(k => {
      delete newHistory[k];
      delete scores[k];
    });
    
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
    localStorage.setItem(scoreKey, JSON.stringify(scores));

    // Sync deletions to cloud
    if (user) {
      try {
        const statsRef = doc(dbCloud, 'user_stats', user.uid);
        await setDoc(statsRef, { history: newHistory, scores }, { merge: true });
      } catch(e) {
        console.error("Failed to delete from cloud:", e);
      }
    }
    
    setHistory(newHistory);
    setSelectedKeys(new Set());
  };
  
  const formatQuizName = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parts.pop();
    const topic = parts.join('_');
    
    let translatedTopic = topic;
    if (topic === 'vocabulary') translatedTopic = t('vocabulary') || 'Vocabulary';
    else if (topic === 'articles') translatedTopic = t('articles_quiz') || 'Articles';
    else if (topic === 'phrases') translatedTopic = t('phrases_sentences_quiz') || 'Phrases';
    else if (topic === 'prepositions') translatedTopic = t('prepositions_quiz') || 'Prepositions';
    else if (topic === 'adjectives') translatedTopic = t('adjectives_quiz') || 'Adjectives';

    if (isCustom) return t('quiz_title_custom', { topic: translatedTopic, id: quizId || '' }).trim();
    return t('quiz_title_public', { topic: translatedTopic, id: quizId || '' }).trim();
  };

  const downloadResults = (key: string, data: any) => {
    if (!data.questions) return;
    
    const exportData = data.questions.map((q: any, i: number) => {
      const userAnswer = data.userAnswers ? data.userAnswers[i] || '' : '';
      const isCorrect = userAnswer === q.correctAnswer;
      return {
        [t('csv_question') || 'Question']: q.questionText || '',
        [t('your_answer') || 'Your Answer']: userAnswer,
        [t('correct_answer') || 'Correct Answer']: isCorrect ? '' : (q.correctAnswer || ''),
        [t('csv_result') || 'Result']: isCorrect ? '✅' : '❌'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `${key}_results.xlsx`);
  };

  const getQuizUrl = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parts.pop();
    const topic = parts.join('_');
    return `/quiz?topic=${topic}&quizId=${quizId}${isCustom ? '&custom=true' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('statistics_page_title') || 'Statistics'}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('statistics_page_subtitle') || 'Track your progress over time.'}</p>
          </div>
        </div>

      {!user && (
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 text-blue-900 p-5 rounded-[1.5rem] shadow-sm text-sm font-medium mb-6">
          {t('guest_warning_stats') || 'As a guest user, your results will appear here until you close the app. If you want to keep your progress saved, log in '} <Link to="/login" className="font-bold underline">{t('guest_warning_stats_link') || 'here'}</Link>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden transition-all duration-300 p-6 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold text-blue-950">{t('quizzes_solved') || 'Quiz History'}</h2>
          {selectedKeys.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              {t('delete_selected_records') || 'Delete Selected'}
            </button>
          )}
        </div>
             
        {Object.keys(history).length === 0 ? (
          <div className="text-center text-blue-900/60 p-12 bg-white/40 rounded-2xl border border-dashed border-gray-300 font-medium">
            {t('no_quizzes_solved') || 'You haven\'t completed any quizzes yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-t border-blue-50/50 min-w-[600px]">
              <thead className="bg-blue-50/30">
                <tr>
                  <th className="p-3 sm:p-5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedKeys.size === Object.keys(history).length && Object.keys(history).length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKeys(new Set(Object.keys(history)));
                        } else {
                          setSelectedKeys(new Set());
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded border-blue-200 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">Quiz</th>
                  <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">Score</th>
                  <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider text-center">{t('result') || 'Result'}</th>
                  <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50/50">
                {Object.entries(history).map(([quizKey, data]) => {
                  const score = data.score || 0;
                  const total = data.questions?.length || 20;
                  const percentage = Math.round((score / total) * 100) || 0;
                  
                  let statusColor = "bg-gray-100 text-gray-800";
                  let statusText = t('status_needs_practice') || "Needs Practice";
                  if (percentage >= 76) {
                    statusColor = "bg-green-100 text-green-800 border-green-200";
                    statusText = t('status_excellent') || "Excellent";
                  } else if (percentage >= 41) {
                    statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
                    statusText = t('status_good') || "Good";
                  } else {
                    statusColor = "bg-red-100 text-red-800 border-red-200";
                  }

                  return (
                    <tr key={quizKey} className="hover:bg-white/60 transition-colors group">
                      <td className="p-3 sm:p-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(quizKey)}
                          onChange={() => toggleSelection(quizKey)}
                          className="w-5 h-5 text-blue-600 rounded border-blue-200 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 sm:p-5 font-bold text-blue-950 whitespace-nowrap">
                        {formatQuizName(quizKey)}
                      </td>
                      <td className="p-3 sm:p-5">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-700">{score} / {total}</span>
                          <span className="text-xs text-gray-500">({percentage}%)</span>
                        </div>
                        <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${percentage >= 76 ? 'bg-green-500' : percentage >= 41 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-5 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-3 sm:p-5 text-right">
                        <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadResults(quizKey, data)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('download_button') || 'Download Excel'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          </button>
                          <Link
                            to={`/results?quizKey=${quizKey}`}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium p-2 hover:bg-purple-50 rounded-lg transition-colors"
                            title={t('review_button') || 'Review Answers'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </Link>
                          <Link
                            to={getQuizUrl(quizKey)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('redo_button') || 'Redo Quiz'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
