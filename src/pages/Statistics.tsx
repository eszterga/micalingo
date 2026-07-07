import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useI18n } from "../I18nContext";
import { Link } from "react-router-dom";

export default function Statistics() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [history, setHistory] = useState<Record<string, any>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const historyKey = user ? `micalingo_history_${user.uid}` : 'micalingo_guest_history';
    setHistory(JSON.parse(localStorage.getItem(historyKey) || '{}'));
  }, [user]);

  const toggleSelection = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const handleBulkDelete = () => {
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
    
    setHistory(newHistory);
    setSelectedKeys(new Set());
  };

  const downloadCsv = (key: string, data: any) => {
    let csv = `${t('csv_question') || 'Question'},${t('your_answer') || 'Your Answer'},${t('correct_answer') || 'Correct Answer'},${t('csv_result') || 'Result'}\n`;
    if (data.questions) {
      data.questions.forEach((q: any, i: number) => {
        const userAnswer = data.userAnswers ? data.userAnswers[i] || '' : '';
        const isCorrect = userAnswer === q.correctAnswer;
        const statusText = isCorrect ? (t('csv_correct') || 'Correct') : (t('csv_incorrect') || 'Incorrect');
        csv += `"${q.questionText}","${userAnswer}","${q.correctAnswer}","${statusText}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}_results.csv`;
    a.click();
  };

  const getQuizUrl = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parts.pop();
    const topic = parts.join('_');
    return `/quiz?topic=${topic}&quizId=${quizId}${isCustom ? '&custom=true' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('statistics_page_title') || 'Statistics'}</h1>
          <p className="text-gray-600 mt-1">{t('statistics_page_subtitle') || 'Track your progress over time.'}</p>
        </div>
      </div>

      {!user && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl shadow-sm text-sm">
          {t('guest_warning_stats') || 'As a guest user, your results will appear here until you close the app. If you want to keep your progress saved, log in '} <Link to="/login" className="font-bold underline text-blue-900">{t('guest_warning_stats_link') || 'here'}</Link>.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{t('quizzes_solved') || 'Quiz History'}</h2>
          {selectedKeys.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors"
            >
              {t('delete_selected_records') || 'Delete Selected'}
            </button>
          )}
        </div>
            
        {Object.keys(history).length === 0 ? (
          <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">
            {t('no_quizzes_solved') || 'You haven\'t completed any quizzes yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="p-3 w-10 text-center">
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
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3 font-semibold text-gray-600 text-sm">Quiz</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm">Score</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm text-center">Status</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(history).map(([quizKey, data]) => {
                  const score = data.score || 0;
                  const total = data.questions?.length || 20;
                  const percentage = Math.round((score / total) * 100) || 0;
                  
                  let statusColor = "bg-gray-100 text-gray-800";
                  let statusText = "Needs Practice";
                  if (percentage >= 80) {
                    statusColor = "bg-green-100 text-green-800 border-green-200";
                    statusText = "Excellent";
                  } else if (percentage >= 50) {
                    statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
                    statusText = "Good";
                  } else {
                    statusColor = "bg-red-100 text-red-800 border-red-200";
                  }

                  return (
                    <tr key={quizKey} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(quizKey)}
                          onChange={() => toggleSelection(quizKey)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-800 capitalize whitespace-nowrap">
                        {quizKey.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-700">{score} / {total}</span>
                          <span className="text-xs text-gray-500">({percentage}%)</span>
                        </div>
                        <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadCsv(quizKey, data)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium p-2 hover:bg-blue-50 rounded transition-colors"
                            title={t('download_button') || 'Download CSV'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12v9m0 0l-3-3m3 3l3-3"></path></svg>
                          </button>
                          <Link
                            to={`/results?quizKey=${quizKey}`}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium p-2 hover:bg-purple-50 rounded transition-colors"
                            title={t('review_button') || 'Review Answers'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </Link>
                          <Link
                            to={getQuizUrl(quizKey)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium p-2 hover:bg-green-50 rounded transition-colors"
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
  );
}
