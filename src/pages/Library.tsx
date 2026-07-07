import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function Library() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('library')}</h1>
        <p className="text-gray-600 mt-1">{t('library_subtitle')}</p>
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