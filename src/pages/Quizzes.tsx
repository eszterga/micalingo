import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";

export default function Quizzes() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('quizzes_title')}</h1>
          <p className="text-gray-600 mt-1">{t('quizzes_subtitle')}</p>
        </div>
      </div>

      {/* Public Quizzes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('test_your_knowledge')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('test_your_knowledge_subtitle')}</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/quizzes/vocabulary" className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-400 hover:bg-white transition-all">
            <h3 className="font-bold text-blue-900">{t('vocabulary')}</h3>
            <p className="text-sm text-blue-700 mt-1">{t('vocabulary_quiz_subtitle')}</p>
          </Link>
          <Link to="/quizzes/articles" className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-400 hover:bg-white transition-all">
            <h3 className="font-bold text-blue-900">{t('articles_quiz')}</h3>
            <p className="text-sm text-blue-700 mt-1">{t('articles_quiz_subtitle')}</p>
          </Link>
          <Link to="/quizzes/phrases" className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-400 hover:bg-white transition-all">
            <h3 className="font-bold text-blue-900">{t('phrases_quiz')}</h3>
            <p className="text-sm text-blue-700 mt-1">{t('phrases_quiz_subtitle')}</p>
          </Link>
          <Link to="/quizzes/prepositions" className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-400 hover:bg-white transition-all">
            <h3 className="font-bold text-blue-900">{t('prepositions_quiz')}</h3>
            <p className="text-sm text-blue-700 mt-1">{t('prepositions_quiz_subtitle')}</p>
          </Link>
        </div>
      </div>

      {/* Custom Quizzes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('create_your_own_quizzes')}</h2>
        
        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('create_your_own_quizzes_subtitle_loggedin')}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <Link to="/quizzes/vocabulary?tab=custom" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-white transition-all">
                <h3 className="font-bold text-gray-800">{t('vocabulary_quiz')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('custom_vocab_desc')}</p>
              </Link>
              <Link to="/quizzes/articles?tab=custom" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-white transition-all">
                <h3 className="font-bold text-gray-800">{t('articles_quiz')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('custom_articles_desc')}</p>
              </Link>
              <Link to="/quizzes/phrases?tab=custom" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-white transition-all">
                <h3 className="font-bold text-gray-800">{t('phrases_quiz')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('custom_phrases_desc')}</p>
              </Link>
              <Link to="/quizzes/prepositions?tab=custom" className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-white transition-all">
                <h3 className="font-bold text-gray-800">{t('prepositions_quiz')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('custom_prepositions_desc')}</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">{t('create_your_own_quizzes_subtitle_loggedout')}</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              {t('login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
