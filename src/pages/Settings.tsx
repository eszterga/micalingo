import { useState, useEffect } from "react";
import { useI18n } from "../I18nContext";
import { Link } from "react-router-dom";

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  
  const [selectedLang, setSelectedLang] = useState(language);
  const [showExamples, setShowExamples] = useState(() => {
    return localStorage.getItem('micalingo_show_examples') !== 'false';
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  const languages = [
    { code: 'en', label: t('english') || 'English', flag: 'EN' },
    { code: 'de', label: t('german') || 'Deutsch', flag: 'DE' },
    { code: 'hu', label: t('hungarian') || 'Magyar', flag: 'HU' }
  ];

  const handleSave = () => {
    setLanguage(selectedLang as 'en' | 'de' | 'hu');
    localStorage.setItem('micalingo_show_examples', JSON.stringify(showExamples));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings_title')}</h1>
          <p className="text-gray-600 mt-1">{t('settings_subtitle')}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('language_preferences')}</h2>
        <p className="text-gray-600">{t('language_preferences_subtitle')}</p>
        
        <div className="flex flex-wrap gap-3 mt-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code as 'en' | 'de' | 'hu')}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl font-medium transition-all border ${
                selectedLang === lang.code
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-1 ring-blue-400'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center text-xs font-bold bg-white border border-gray-200 rounded text-gray-600 shadow-sm">{lang.flag}</span>
              <span>{lang.label}</span>
              {selectedLang === lang.code && (
                <svg className="w-5 h-5 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{t('practice_settings')}</h2>
        <p className="text-gray-600">{t('practice_settings_subtitle')}</p>
        
        <div className="flex items-center gap-3 mt-4">
          <input 
            type="checkbox" 
            id="showExample" 
            checked={showExamples}
            onChange={(e) => setShowExamples(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded cursor-pointer border-gray-300 focus:ring-blue-500" 
          />
          <label htmlFor="showExample" className="font-medium text-gray-700 cursor-pointer">
            {t('show_example_sentences')}
          </label>
        </div>
        <p className="text-sm text-gray-500 ml-8">{t('show_example_sentences_subtitle')}</p>
      </div>

      {/* Save Settings Action */}
      <div className="flex justify-end pt-2 pb-6 border-b border-gray-200">
        <button 
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-sm transition-all ${
            isSaved 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaved ? (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> {t('saved') || 'Saved!'}</>
          ) : (
            t('save_preferences') || 'Save Preferences'
          )}
        </button>
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