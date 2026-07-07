import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function Library() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('library')}</h1>
          <p className="text-gray-600 mt-1">{t('library_subtitle')}</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/vocabulary" className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-blue-300">
          <h2 className="text-xl font-bold text-blue-700 mb-2">{t('vocabulary')}</h2>
          <p className="text-gray-600">{t('vocab_subtitle') || 'Manage your words.'}</p>
        </Link>
        
        <Link to="/learning-materials" className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-blue-300">
          <h2 className="text-xl font-bold text-blue-700 mb-2">{t('learning_materials')}</h2>
          <p className="text-gray-600">{t('learning_materials_subtitle')}</p>
        </Link>
      </div>
    </div>
  );
}