import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function ReadingMaterials() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/learning-materials" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('read_materials')}</h1>
          <p className="text-gray-600 mt-1">{t('read_materials_desc')}</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/learning-materials/reading/false-friends" className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-blue-300">
          <h2 className="text-xl font-bold text-blue-700 mb-2">{t('false_friends')}</h2>
          <p className="text-gray-600">{t('false_friends_desc')}</p>
        </Link>
      </div>
    </div>
  );
}