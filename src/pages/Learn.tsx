import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import { LEARN_GUIDES, guideTitle, guideDescription } from '../lib/learnContent';
import type { LearnLang } from '../lib/learnContent';

export default function Learn() {
  const { t, language } = useI18n();
  const lang = language as LearnLang;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('home') || 'Home'}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-3">{t('learn_hub_title')}</h1>
          <p className="text-blue-900/70 font-medium leading-relaxed">{t('learn_hub_intro')}</p>
        </div>
        <ul className="space-y-4">
          {LEARN_GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                to={`/learn/${guide.slug}`}
                className="block p-5 rounded-2xl bg-blue-50/80 border border-blue-100 hover:border-blue-300 hover:bg-white transition-colors"
              >
                <h2 className="text-xl font-extrabold text-blue-950 mb-1">{guideTitle(guide, lang)}</h2>
                <p className="text-sm text-blue-800/70 font-medium leading-relaxed mb-2">{guideDescription(guide, lang)}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700/70">
                  {t('learn_read_time', { minutes: guide.minutes })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <nav className="flex flex-wrap gap-3 pt-2 border-t border-blue-100 text-sm font-bold">
          <Link to="/quizzes" className="text-blue-700 hover:text-blue-900">{t('quizzes')}</Link>
          <Link to="/grammar" className="text-blue-700 hover:text-blue-900">{t('grammar')}</Link>
          <Link to="/about" className="text-blue-700 hover:text-blue-900">{t('footer_about')}</Link>
        </nav>
      </article>
    </div>
  );
}
