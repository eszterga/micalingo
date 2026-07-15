import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function Grammar() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('grammar_page_title')}</h1>
          <p className="text-gray-600 mt-1">{t('grammar_page_subtitle')}</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('page_under_construction')}</h2>
          <p className="text-gray-600">{t('check_back_later')}</p>
        </div>
      </div>
    </div>
  );
}