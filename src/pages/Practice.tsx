import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";

export default function Practice() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Practice</h1>
          <p className="text-gray-600 mt-1">Select a topic to practice.</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">Coming soon</div>
    </div>
  );
}
