import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import { LegalParagraph } from '../components/LegalText';

const SECTION_KEYS = [1, 2, 3, 4, 5, 6] as const;

export default function Impressum() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('home') || 'Home'}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-2">{t('impressum_title')}</h1>
        <p className="text-sm font-medium text-blue-800/60 mb-6">{t('last_updated')}</p>
        <LegalParagraph text={t('impressum_intro')} className="mb-8" />
        <div className="space-y-8">
          {SECTION_KEYS.map((n) => (
            <section key={n}>
              <h2 className="text-lg font-extrabold text-blue-900 mb-2">{t(`impressum_s${n}_title`)}</h2>
              <LegalParagraph text={t(`impressum_s${n}_body`)} />
            </section>
          ))}
        </div>
        <nav className="flex flex-wrap gap-4 pt-8 mt-4 border-t border-blue-100 text-sm font-bold">
          <Link to="/privacy" className="text-blue-700 hover:text-blue-900">{t('footer_privacy')}</Link>
          <Link to="/terms" className="text-blue-700 hover:text-blue-900">{t('footer_terms')}</Link>
          <Link to="/cookies" className="text-blue-700 hover:text-blue-900">{t('footer_cookies')}</Link>
          <Link to="/about" className="text-blue-700 hover:text-blue-900">{t('footer_about')}</Link>
        </nav>
      </article>
    </div>
  );
}
