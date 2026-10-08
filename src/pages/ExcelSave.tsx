import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import { downloadBase64Excel } from '../lib/downloadWorkbook';

export default function ExcelSave() {
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const file = useMemo(() => {
    const data = searchParams.get('file');
    const name = searchParams.get('name') || 'MicaLingo.xlsx';
    if (!data) return null;
    return { data, name };
  }, [searchParams]);

  const save = () => {
    if (!file) return;
    downloadBase64Excel(file.data, file.name);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-blue-900 mb-3">{t('excel_save_title')}</h1>
      <p className="text-gray-600 leading-relaxed mb-8">{file ? t('excel_save_body') : t('excel_save_failed')}</p>
      {file && (
        <button
          type="button"
          onClick={save}
          className="w-full px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm text-lg touch-manipulation active:bg-blue-700"
        >
          {t('excel_save_button')}
        </button>
      )}
    </div>
  );
}
