import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { useCloudVocabulary } from "../lib/firestore";
import {
  buildPublicQuizPool,
  buildCustomQuizPool,
  getQuizLevelCount,
} from "../lib/quizPool";
import * as XLSX from 'xlsx';
import { filterMarkedWords, getMarkedQuizLevels } from "./markedWordsQuizEngine";

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

export default function Results() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Record<string, any>>({});
  const [selectedQuizKey, setSelectedQuizKey] = useState<string | null>(searchParams.get("quizKey"));
  const publicDbWords = useCloudVocabulary("PUBLIC_LIBRARY") || [];
  const userVocabulary = useCloudVocabulary(user?.uid);

  useEffect(() => {
    const historyKey = user ? `micalingo_history_${user.uid}` : 'micalingo_guest_history';
    const h = JSON.parse(localStorage.getItem(historyKey) || '{}');
    setHistory(h);
    
    if (!selectedQuizKey && Object.keys(h).length > 0) {
      setSelectedQuizKey(Object.keys(h)[Object.keys(h).length - 1]);
    }
  }, [user?.uid, selectedQuizKey]);

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

  const getTopicQuizzesUrl = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    parts.pop(); // quizId
    const topic = parts.join('_');
    if (topic === 'marked') return '/quizzes?tab=marked';
    return `/quizzes/${topic}${isCustom ? '?tab=custom' : ''}`;
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
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parseInt(parts.pop() || '0');
    const topic = parts.join('_');

    if (topic === 'marked') {
      if (!userVocabulary) return false;
      const levels = getMarkedQuizLevels(filterMarkedWords(userVocabulary));
      return quizId >= levels;
    }

    if (isCustom) {
      if (!userVocabulary) return false; // still loading — allow Next
      const customCount = buildCustomQuizPool(topic, userVocabulary).length;
      const maxQuizzes = Math.max(1, getQuizLevelCount(customCount));
      if (maxQuizzes <= 1) return false; // undercount safeguard — still offer Next
      return quizId >= maxQuizzes;
    }

    // Same public pool as TopicQuizzes / Quiz so "next level" agrees with the list
    const pool = buildPublicQuizPool(topic, publicDbWords);
    const maxQuizzes = Math.max(1, getQuizLevelCount(pool.length));
    return quizId >= maxQuizzes;
  };

  const quizData = selectedQuizKey ? history[selectedQuizKey] : null;
  const hasNextLevel = selectedQuizKey && !isLastQuiz(selectedQuizKey);
  
  const formatQuizName = (key: string) => {
    const isCustom = key.startsWith('custom_');
    const stripped = isCustom ? key.replace('custom_', '') : key;
    const parts = stripped.split('_');
    const quizId = parts.pop();
    const topic = parts.join('_');

    if (topic === 'marked') {
      return t('quiz_title_marked', { id: quizId || '' }).trim();
    }
    
    let translatedTopic = topic;
    if (topic === 'vocabulary') translatedTopic = t('vocabulary') || 'Vocabulary';
    else if (topic === 'articles') translatedTopic = t('articles_quiz') || 'Articles';
    else if (topic === 'phrases') translatedTopic = t('phrases_sentences_quiz') || 'Phrases';
    else if (topic === 'prepositions') translatedTopic = t('prepositions_quiz') || 'Prepositions';
    else if (topic === 'adjectives') translatedTopic = t('adjectives_quiz') || 'Adjectives';
    else if (topic === 'verbs') translatedTopic = t('verbs_quiz') || 'Verbs';

    if (isCustom) return t('quiz_title_custom', { topic: translatedTopic, id: quizId || '' }).trim();
    return t('quiz_title_public', { topic: translatedTopic, id: quizId || '' }).trim();
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.length > 2 ? window.history.back() : navigate('/quizzes')} 
            className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {t('back_button')}
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('results_page_title') || 'Quiz Results'}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('results_page_subtitle') || 'Review your answers.'}</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <select 
              value={selectedQuizKey || ''} 
              onChange={(e) => setSelectedQuizKey(e.target.value)}
              className="bg-white/80 border border-white text-blue-950 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-3 shadow-sm font-bold outline-none"
            >
              {Object.keys(history).length === 0 && <option value="">No quizzes completed yet</option>}
              {Object.keys(history).map(key => (
                <option key={key} value={key}>{formatQuizName(key)}</option>
              ))}
            </select>
            
            {quizData && (
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => downloadResults(selectedQuizKey!, quizData)} 
                  className="flex-1 sm:flex-none justify-center items-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm"
                >
                  {t('download_button') || 'Download Excel'}
                </button>
                <Link 
                  to={getQuizUrl(selectedQuizKey!)} 
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm"
                >
                  {t('redo_button') || 'Redo Quiz'}
                </Link>
              </div>
            )}
          </div>

          {!quizData ? (
            <div className="text-center text-blue-900/60 p-12 bg-white/40 rounded-[2rem] border border-dashed border-gray-300 font-medium">
              {t('no_quizzes_solved') || 'No quiz data found.'}
            </div>
          ) : (
            <>
              <div className="mb-8 p-6 bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-blue-900 text-lg">{t('your_score') || 'Your Score'}:</span>
                    <span className="ml-3 text-2xl font-extrabold text-blue-700">{quizData.score} / {quizData.questions?.length || 20} <span className="text-blue-600/70 text-lg">({Math.round((quizData.score / (quizData.questions?.length || 20)) * 100)}%)</span></span>
                  </div>
                  <div className="px-4 py-2 bg-blue-100/80 text-blue-800 rounded-xl text-sm font-bold uppercase tracking-wider">
                    {t('quiz_complete') || 'Quiz Complete!'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {quizData.questions?.map((q: any, i: number) => {
                  const userAnswer = quizData.userAnswers ? quizData.userAnswers[i] : null;
                  const isCorrect = userAnswer === q.correctAnswer;
                  
                  return (
                    <div key={i} className={`p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm ${isCorrect ? 'bg-green-50/80 border-green-300' : 'bg-red-50/80 border-red-300'}`}>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="font-bold text-gray-900 text-xl">{i + 1}. {q.questionText}</p>
                        {isCorrect ? (
                          <span className="shrink-0 bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">✅ {t('csv_correct') || 'Correct'}</span>
                        ) : (
                          <span className="shrink-0 bg-red-100 text-red-800 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">❌ {t('csv_incorrect') || 'Incorrect'}</span>
                        )}
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('your_answer') || 'Your Answer'}</span>
                          <div className={`p-3.5 rounded-xl border ${isCorrect ? 'bg-green-100/50 border-green-300 text-green-900 font-bold' : 'bg-red-100/50 border-red-300 text-red-900 font-bold line-through'}`}>
                            {userAnswer || '-'}
                          </div>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('correct_answer') || 'Correct Answer'}</span>
                          <div className="p-3.5 rounded-xl border bg-green-100/50 border-green-300 text-green-900 font-bold">
                            {q.correctAnswer}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Next Level Button Section */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-white/60">
                <button 
                  onClick={() => navigate(selectedQuizKey ? getTopicQuizzesUrl(selectedQuizKey) : '/quizzes')} 
                  className="w-full sm:w-auto justify-center bg-white/70 backdrop-blur-md border border-white text-gray-700 font-bold px-6 py-3.5 rounded-xl shadow-sm hover:bg-white transition-all"
                >
                  {t('back_to_quizzes') || 'Back to Quizzes'}
                </button>
                {hasNextLevel && (
                  <Link 
                    to={getNextLevelUrl(selectedQuizKey!)} 
                    className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    {t('next_quiz_button') || 'Next Quiz →'}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
