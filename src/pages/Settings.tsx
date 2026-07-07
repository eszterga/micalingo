import { useI18n } from "../I18nContext";
export default function Settings() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings_title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings_subtitle')}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('language_preferences')}</h2>
        <p className="text-gray-600">{t('language_preferences_subtitle')}</p>
        {/* Placeholder for language toggle UI */}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('practice_settings')}</h2>
        <p className="text-gray-600">{t('practice_settings_subtitle')}</p>
        
        <div className="flex items-center gap-3 mt-4">
          <input type="checkbox" id="showExample" className="w-5 h-5 text-blue-600 rounded cursor-pointer" />
          <label htmlFor="showExample" className="font-medium text-gray-700 cursor-pointer">
            {t('show_example_sentences')}
          </label>
        </div>
        <p className="text-sm text-gray-500 ml-8">{t('show_example_sentences_subtitle')}</p>
      </div>

      <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200 space-y-4">
        <h2 className="text-xl font-semibold text-red-800">{t('developer_tools')}</h2>
        <p className="text-red-600">{t('developer_tools_subtitle')}</p>
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
          {t('hard_reset_database')}
        </button>
      </div>
    </div>
  );
}