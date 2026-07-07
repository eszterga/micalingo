import { useI18n } from "../I18nContext";
import { Link } from "react-router-dom";

export default function CreateQuiz() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/quizzes" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('create_your_own_quizzes')}</h1>
          <p className="text-gray-600 mt-1">{t('create_your_own_quizzes_subtitle_loggedin')}</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('choose_data_source')}</h2>
        
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div className="border border-gray-200 p-6 rounded-xl hover:border-blue-400 cursor-pointer transition-colors">
            <h3 className="font-bold text-lg text-blue-700">{t('use_personal_library')}</h3>
            <p className="text-gray-600 mt-2 text-sm">{t('use_personal_library_desc')}</p>
          </div>
          
          <div className="border border-gray-200 p-6 rounded-xl hover:border-blue-400 cursor-pointer transition-colors">
            <h3 className="font-bold text-lg text-blue-700">{t('upload_new_file')}</h3>
            <p className="text-gray-600 mt-2 text-sm">{t('upload_new_file_desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}