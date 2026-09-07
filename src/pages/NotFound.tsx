import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';

export default function NotFound() {
  const { t, language } = useI18n();
  const body =
    language === 'de'
      ? 'Diese Seite gibt es nicht. Öffne die Startseite, um Deutsch mit Quizzen, Grammatik und Wortschatz zu lernen.'
      : language === 'hu'
        ? 'Ez az oldal nem létezik. Nyisd meg a kezdőlapot, és folytasd a német tanulást kvízekkel, nyelvtannal és szókinccsel.'
        : 'This page does not exist. Open the home page to keep learning German with quizzes, grammar, and vocabulary.';

  return (
    <div className="max-w-xl mx-auto pb-16 text-center">
      <article className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 space-y-4">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700/70">404</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950">
          {t('topic_not_found') || 'Page not found'}
        </h1>
        <p className="text-blue-900/70 font-medium leading-relaxed">{body}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center mt-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm"
        >
          {t('home') || 'Home'}
        </Link>
      </article>
    </div>
  );
}
