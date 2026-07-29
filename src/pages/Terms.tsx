import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';

const SECTION_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export default function Terms() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('home') || 'Home'}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-2">{t('terms_title')}</h1>
        <p className="text-sm font-medium text-blue-800/60 mb-6">{t('last_updated')}</p>
        <p className="text-gray-700 leading-relaxed mb-8">{t('terms_intro')}</p>
        <div className="space-y-8">
          {SECTION_KEYS.map((n) => (
            <section key={n}>
              <h2 className="text-lg font-extrabold text-blue-900 mb-2">{t(`terms_s${n}_title`)}</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{t(`terms_s${n}_body`)}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
