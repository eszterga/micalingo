import { Link, Navigate, useParams } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import ArticleBody from '../components/ArticleBody';
import { getLearnGuide, guideBody, guideTitle, guideDescription, LEARN_GUIDES } from '../lib/learnContent';
import type { LearnLang } from '../lib/learnContent';

export default function LearnGuide() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useI18n();
  const lang = language as LearnLang;
  const guide = slug ? getLearnGuide(slug) : undefined;

  if (!guide) {
    return <Navigate to="/learn" replace />;
  }

  const others = LEARN_GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/learn" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 mb-6">
        ← {t('learn_hub_title')}
      </Link>
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700/70 mb-3">
          {t('learn_byline', { minutes: guide.minutes })}
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">{guideTitle(guide, lang)}</h1>
        <p className="text-blue-900/70 font-medium leading-relaxed mb-8">{guideDescription(guide, lang)}</p>
        <ArticleBody markdown={guideBody(guide, lang)} />
        {others.length > 0 && (
          <nav className="mt-10 pt-6 border-t border-blue-100">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-blue-800/70 mb-3">{t('learn_more_guides')}</h2>
            <ul className="space-y-2">
              {others.map((g) => (
                <li key={g.slug}>
                  <Link to={`/learn/${g.slug}`} className="font-bold text-blue-700 hover:text-blue-900">
                    {guideTitle(g, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </div>
  );
}
