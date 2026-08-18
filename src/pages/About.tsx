import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';

function AboutBody({ text, supportLabel }: { text: string; supportLabel: string }) {
  const parts = text.split('{support_link}');

  const openSupport = () => {
    window.dispatchEvent(new CustomEvent('openSupportModal'));
  };

  if (parts.length < 2) {
    return <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{text}</p>;
  }

  return (
    <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
      {parts[0]}
      <button
        type="button"
        onClick={openSupport}
        className="font-bold text-pink-600 hover:text-pink-700 underline underline-offset-2 transition-colors"
      >
        {supportLabel}
      </button>
      {parts[1]}
    </p>
  );
}

export default function About() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('home') || 'Home'}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10 space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-2">{t('about_title')}</h1>
          <p className="text-sm font-medium text-blue-800/60">{t('last_updated')}</p>
        </div>

        <section>
          <h2 className="text-xl font-extrabold text-blue-900 mb-3">{t('about_heading')}</h2>
          <AboutBody text={t('about_body')} supportLabel={t('support_micalingo')} />
          <p className="text-gray-700 leading-relaxed">{t('about_mission')}</p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-blue-900 mb-3">{t('contact_heading')}</h2>
          <p className="text-gray-700 leading-relaxed mb-6">{t('contact_body')}</p>
          <div className="grid gap-4 sm:grid-cols-1">
            <a
              href="mailto:support.micalingo@gmail.com"
              className="flex flex-col gap-1 p-5 rounded-2xl bg-blue-50/80 border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700/70">{t('contact_support_label')}</span>
              <span className="text-lg font-bold text-blue-950">support.micalingo@gmail.com</span>
            </a>
            <a
              href="https://micalingo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 p-5 rounded-2xl bg-blue-50/80 border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700/70">{t('contact_website_label')}</span>
              <span className="text-lg font-bold text-blue-950">micalingo.com</span>
            </a>
          </div>
        </section>

        <nav className="flex flex-wrap gap-4 pt-2 border-t border-blue-100 text-sm font-bold">
          <Link to="/privacy" className="text-blue-700 hover:text-blue-900">{t('footer_privacy')}</Link>
          <Link to="/terms" className="text-blue-700 hover:text-blue-900">{t('footer_terms')}</Link>
          <Link to="/cookies" className="text-blue-700 hover:text-blue-900">{t('footer_cookies')}</Link>
          <Link to="/impressum" className="text-blue-700 hover:text-blue-900">{t('footer_impressum')}</Link>
        </nav>
      </article>
    </div>
  );
}
