import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions } from "../lib/public-data";

const WORDS_PER_QUIZ = 20;

const TOPIC_QUIZ_COUNTS: Record<string, number> = {
  vocabulary: Math.ceil(publicVocabulary.length / WORDS_PER_QUIZ),
  phrases: Math.ceil(publicPhrases.length / WORDS_PER_QUIZ),
  articles: Math.ceil(publicArticles.length / WORDS_PER_QUIZ),
  prepositions: Math.ceil(publicPrepositions.length / WORDS_PER_QUIZ),
};

export default function Results() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Record<string, any>>({});
  const [selectedQuizKey, setSelectedQuizKey] = useState<string | null>(searchParams.get("quizKey"));

  useEffect(() => {
    const historyKey = user ? `micalingo_history_${user.uid}` : 'micalingo_guest_history';
    const h = JSON.parse(localStorage.getItem(historyKey) || '{}');
    setHistory(h);
    
    if (!selectedQuizKey && Object.keys(h).length > 0) {
      setSelectedQuizKey(Object.keys(h)[Object.keys(h).length - 1]);
    }
  }, [user, selectedQuizKey]);

  const downloadCsv = (key: string, data: any) => {
    let csv = `German,Hungarian,Example,${t('csv_question') || 'Question'},${t('your_answer') || 'Your Answer'},${t('correct_answer') || 'Correct Answer'},${t('csv_result') || 'Result'}\n`;
    if (data.questions) {
      data.questions.forEach((q: any, i: number) => {
        const userAnswer = data.userAnswers ? data.userAnswers[i] || '' : '';
        const isCorrect = userAnswer === q.correctAnswer;
        const statusText = isCorrect ? '✅' : '❌';
        csv += `"${q.german || ''}","${q.hungarian || ''}","${q.example || ''}","${q.questionText}","${userAnswer}","${q.correctAnswer}","${statusText}"\n`;
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

  const getNextLevelUrl = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parseInt(parts.pop() || '0');
    const topic = parts.join('_');
    const nextQuizId = quizId + 1;
    return `/quiz?topic=${topic}&quizId=${nextQuizId}${isCustom ? '&custom=true' : ''}`;
  };

  const isLastQuiz = (key: string) => {
    const isCustom = key.startsWith('custom_');
    if (isCustom) return true; // Can't determine max for custom quizzes; don't show Next
    const parts = key.split('_');
    const quizId = parseInt(parts.pop() || '0');
    const topic = parts.join('_');
    const maxQuizzes = TOPIC_QUIZ_COUNTS[topic];
    if (maxQuizzes === undefined) return true;
    return quizId >= maxQuizzes;
  };

  const quizData = selectedQuizKey ? history[selectedQuizKey] : null;
  const hasNextLevel = selectedQuizKey && !isLastQuiz(selectedQuizKey);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => window.history.length > 2 ? window.history.back() : navigate('/quizzes')} 
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          {t('back_button')}
        </button>
        <div>
          <h1 className="text-3xl font-bold">{t('results_page_title') || 'Quiz Results'}</h1>
          <p className="text-gray-600 mt-1">{t('results_page_subtitle') || 'Review your answers.'}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <select 
            value={selectedQuizKey || ''} 
            onChange={(e) => setSelectedQuizKey(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2.5 capitalize font-medium"
          >
            {Object.keys(history).length === 0 && <option value="">No quizzes completed yet</option>}
            {Object.keys(history).map(key => (
              <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>
            ))}
          </select>
          
          {quizData && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => downloadCsv(selectedQuizKey!, quizData)} 
                className="flex-1 sm:flex-none justify-center items-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
              >
                {t('download_button') || 'Download CSV'}
              </button>
              <Link 
                to={getQuizUrl(selectedQuizKey!)} 
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
              >
                {t('redo_button') || 'Redo Quiz'}
              </Link>
            </div>
          )}
        </div>

        {!quizData ? (
          <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">
            {t('no_quizzes_solved') || 'No quiz data found.'}
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-blue-900">{t('your_score') || 'Your Score'}:</span>
                  <span className="ml-2 text-xl font-bold text-blue-700">{quizData.score} / {quizData.questions?.length || 20} ({Math.round((quizData.score / (quizData.questions?.length || 20)) * 100)}%)</span>
                </div>
                <div className="text-sm text-blue-800 font-semibold">
                  {t('quiz_complete') || 'Quiz Complete!'}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {quizData.questions?.map((q: any, i: number) => {
                const userAnswer = quizData.userAnswers ? quizData.userAnswers[i] : null;
                const isCorrect = userAnswer === q.correctAnswer;
                
                return (
                  <div key={i} className={`p-4 rounded-xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <p className="font-bold text-gray-900 text-lg">{i + 1}. {q.questionText}</p>
                      {isCorrect ? (
                        <span className="shrink-0 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">✅ {t('csv_correct') || 'Correct'}</span>
                      ) : (
                        <span className="shrink-0 bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">❌ {t('csv_incorrect') || 'Incorrect'}</span>
                      )}
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('your_answer') || 'Your Answer'}</span>
                        <div className={`p-2 rounded border ${isCorrect ? 'bg-green-100 border-green-300 text-green-800 font-medium' : 'bg-red-100 border-red-300 text-red-800 font-medium line-through'}`}>
                          {userAnswer || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('correct_answer') || 'Correct Answer'}</span>
                        <div className="p-2 rounded border bg-green-100 border-green-300 text-green-800 font-medium">
                          {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Level Button Section */}
            <div className="mt-8 flex gap-4 justify-between">
              <button 
                onClick={() => navigate('/quizzes')} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors shadow-sm"
              >
                {t('back_to_quizzes') || 'Back to Quizzes'}
              </button>
              {hasNextLevel && (
                <Link 
                  to={getNextLevelUrl(selectedQuizKey!)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {t('next_quiz_button') || 'Next Quiz →'}
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
