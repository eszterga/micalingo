import { privateCardIsBlank, privateQuizCard, quizDisplayTitle, type QuizLabelMap } from '../lib/quizLabels';

type Translate = (key: string) => string;

/** Save-to list. Custom private titles replace the default quiz names. */
export function QuizCategoryOptions({
  labels,
  t,
  includeReading = false,
  includeTelc = false,
  includePublicExtras = false,
  blankUntilTitled = false,
}: {
  labels: QuizLabelMap;
  t: Translate;
  includeReading?: boolean;
  includeTelc?: boolean;
  includePublicExtras?: boolean;
  /** Personal library: unnamed article/phrase slots show the fill-in label. */
  blankUntilTitled?: boolean;
}) {
  const title = (topic: 'vocabulary' | 'articles' | 'phrases' | 'prepositions' | 'adjectives' | 'verbs', key: string) => {
    if (blankUntilTitled && privateCardIsBlank(labels, topic)) {
      const icon = privateQuizCard(topic)?.icon;
      const label = t('quiz_slot_title_placeholder');
      return icon ? `${icon} ${label}` : label;
    }
    return quizDisplayTitle(labels, topic, t(key));
  };

  return (
    <>
      <option value="vocabulary">{title('vocabulary', 'dropdown_vocabulary')}</option>
      {includeReading && <option value="reading">{t('dropdown_reading')}</option>}
      <option value="articles">{title('articles', 'dropdown_articles')}</option>
      <option value="phrases">{title('phrases', 'dropdown_phrases')}</option>
      <option value="prepositions">{title('prepositions', 'dropdown_prepositions')}</option>
      <option value="adjectives">{title('adjectives', 'dropdown_adjectives')}</option>
      <option value="verbs">{title('verbs', 'dropdown_verbs')}</option>
      {includeTelc && <option value="telc-b2">{t('dropdown_telc_b2')}</option>}
      {includePublicExtras && (
        <>
          <option value="false_friends">{t('false_friends')}</option>
          <option value="idioms">{t('idioms')}</option>
        </>
      )}
    </>
  );
}
