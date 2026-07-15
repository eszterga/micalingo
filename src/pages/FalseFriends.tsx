import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function FalseFriends() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/learning-materials/reading" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('false_friends')}</h1>
          <p className="text-gray-600 mt-1">{t('false_friends_desc')}</p>
        </div>
      </div>
      
      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('page_under_construction')}</h2>
        <p className="text-gray-600">{t('check_back_later')}</p>
      </div>
    </div>
  );
}