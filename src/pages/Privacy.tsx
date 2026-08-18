import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import { LegalParagraph } from '../components/LegalText';

const SECTION_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export default function Privacy() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('home') || 'Home'}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-2">{t('privacy_title')}</h1>
        <p className="text-sm font-medium text-blue-800/60 mb-6">{t('last_updated')}</p>
        <LegalParagraph text={t('privacy_intro')} className="mb-8" />
        <div className="space-y-8">
          {SECTION_KEYS.map((n) => (
            <section key={n}>
              <h2 className="text-lg font-extrabold text-blue-900 mb-2">{t(`privacy_s${n}_title`)}</h2>
              <LegalParagraph text={t(`privacy_s${n}_body`)} />
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
