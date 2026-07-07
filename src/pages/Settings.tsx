import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { useCloudVocabulary, bulkDeleteCloudWords } from "../lib/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dbCloud } from "../lib/firebase";

interface UserSettings {
  language?: 'en' | 'de' | 'hu';
  showExamples?: boolean;
}

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { user } = useAuth();
  const personalWords = useCloudVocabulary(user?.uid) || [];
  const [isWiping, setIsWiping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load the user's preference from localStorage (defaults to true)
  const [showExamples, setShowExamples] = useState(() => {
    const stored = localStorage.getItem('micalingo_show_examples');
    return stored !== null ? JSON.parse(stored) : true;
  });

  // Fetch settings from Firestore on mount for logged-in users
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        try {
          const settingsRef = doc(dbCloud, 'user_settings', user.uid);
          const snap = await getDoc(settingsRef);
          if (snap.exists()) {
            const settings = snap.data() as UserSettings;
            if (settings.language && settings.language !== language) {
              setLanguage(settings.language);
              localStorage.setItem('micalingo_language', settings.language);
            }
            if (settings.showExamples !== undefined && settings.showExamples !== showExamples) {
              setShowExamples(settings.showExamples);
              localStorage.setItem('micalingo_show_examples', JSON.stringify(settings.showExamples));
            }
          }
        } catch (error) {
          console.error("Failed to fetch settings from cloud", error);
        }
      };
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLanguageChange = (lang: 'en' | 'de' | 'hu') => {
    setLanguage(lang);
    setIsDirty(true);
  };

  const handleToggleExamples = () => {
    setShowExamples((prev: boolean) => !prev);
    setIsDirty(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('micalingo_language', language);
      localStorage.setItem('micalingo_show_examples', JSON.stringify(showExamples));
      if (user) {
        const settingsRef = doc(dbCloud, 'user_settings', user.uid);
        await setDoc(settingsRef, { language, showExamples }, { merge: true });
      }
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  async function handleWipePersonalLibrary(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    // eslint-disable-next-line no-alert
    if (window.confirm(t('confirm_reset_library' as any) || 'Are you sure you want to delete all personal library items? This cannot be undone.')) {
      setIsWiping(true);
      try {
        if (personalWords.length > 0) {
          const ids = personalWords.map(word => word.id).filter((id): id is string => !!id);
          if (ids.length > 0) await bulkDeleteCloudWords(ids);
        }
        // eslint-disable-next-line no-alert
        window.alert(t('library_wiped' as any) || 'Personal library wiped successfully.');
        window.location.reload();
      } catch (error) {
        console.error('Error wiping personal library:', error);
        // eslint-disable-next-line no-alert
        window.alert(t('wipe_error' as any) || 'Failed to wipe personal library. Please try again.');
      } finally {
        setIsWiping(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button') || 'Back'}
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings_title') || 'Settings'}</h1>
          <p className="text-gray-600 mt-1">{t('settings_subtitle') || 'Manage your account and application settings.'}</p>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
        {/* Language Preferences */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('language_preferences') || 'Language Preferences'}</h2>
          <p className="text-gray-600 text-sm mb-4">{t('language_preferences_subtitle') || 'Select the application language.'}</p>
          
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('app_language') || 'App Language'}</label>
            <select 
              value={language} 
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'hu')}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="en">{t('english') || 'English'}</option>
              <option value="de">{t('german') || 'German'}</option>
              <option value="hu">{t('hungarian') || 'Hungarian'}</option>
            </select>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Practice Settings */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('practice_settings') || 'Practice Settings'}</h2>
          <p className="text-gray-600 text-sm mb-4">{t('practice_settings_subtitle') || 'Customize your quiz experience.'}</p>
          
          <div className="flex items-center justify-between max-w-md bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-800">{t('show_example_sentences') || 'Show Example Sentences'}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('show_example_sentences_subtitle') || 'Display example sentences after answering a question.'}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showExamples}
                onChange={handleToggleExamples}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {user && (
          <>
            <hr className="border-gray-200" />

            {/* Data Management */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{t('data_management' as any) || 'Data Management'}</h2>
              <p className="text-gray-600 text-sm mb-4">{t('data_management_subtitle' as any) || 'Manage your saved progress and local data.'}</p>
              
              <div className="space-y-4">
                {/* Clear Local Data */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-3 sm:mb-0 sm:mr-4">
                    <h3 className="font-bold text-gray-800">{t('clear_local_data' as any) || 'Clear Local Progress'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t('clear_local_data_desc' as any) || 'Wipe local quiz scores and progress. Does not delete cloud vocabulary.'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      // eslint-disable-next-line no-alert
                      if (window.confirm(t('confirm_clear_data' as any) || 'Are you sure you want to clear all local progress? This cannot be undone.')) {
                        const lang = localStorage.getItem('micalingo_language');
                        const examples = localStorage.getItem('micalingo_show_examples');
                        localStorage.clear();
                        if (lang) localStorage.setItem('micalingo_language', lang);
                        if (examples) localStorage.setItem('micalingo_show_examples', examples);
                        // eslint-disable-next-line no-alert
                        window.alert(t('data_cleared' as any) || 'Local progress cleared successfully.');
                        window.location.reload();
                      }
                    }}
                    className="whitespace-nowrap bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                  >
                    {t('clear_local_data' as any) || 'Clear Local Progress'}
                  </button>
                </div>

                {/* Wipe Personal Library */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="mb-3 sm:mb-0 sm:mr-4">
                    <h3 className="font-bold text-red-800">{t('reset_personal_library' as any) || 'Reset Personal Library'}</h3>
                    <p className="text-sm text-red-600 mt-1">{t('reset_personal_library_desc' as any) || 'Permanently delete all your custom imported words and grammar materials from the cloud. This cannot be undone.'}</p>
                  </div>
                  <button 
                    onClick={handleWipePersonalLibrary}
                    disabled={isWiping}
                    className="whitespace-nowrap bg-red-600 text-white hover:bg-red-700 font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm disabled:opacity-50"
                  >
                    {isWiping ? (t('wiping_data' as any) || 'Wiping...') : (t('hard_reset_database' as any) || 'Wipe Library')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <hr className="border-gray-200" />

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={!isDirty || isSaving}
            className={`font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors ${
              !isDirty || isSaving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? (t('saving_preferences' as any) || 'Saving...') : isDirty ? (t('save_preferences') || 'Save Preferences') : (t('save_button' as any) || 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
