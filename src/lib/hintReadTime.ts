/** How long a column C hint stays up after a correct answer. */
export type HintReadTime = 'default' | 'short' | 'longer' | 'longest';

/** Choices shown in Settings. The normal pause is not a button. */
export const HINT_READ_TIME_OPTIONS: readonly Exclude<HintReadTime, 'default'>[] = ['short', 'longer', 'longest'];

export const HINT_READ_TIME_STORAGE_KEY = 'micalingo_hint_read_time';

/** No column C hint: the quiz still moves on after about 1.5 seconds. */
export const NO_HINT_ADVANCE_MS = 1500;

export function parseHintReadTime(value: unknown): HintReadTime {
  return value === 'short' || value === 'longer' || value === 'longest' ? value : 'default';
}

export function readHintReadTime(): HintReadTime {
  try {
    return parseHintReadTime(localStorage.getItem(HINT_READ_TIME_STORAGE_KEY));
  } catch {
    return 'default';
  }
}

/**
 * Delay before the next question after a correct answer.
 * With no hint, the quiz moves on after 1.5 seconds.
 * With a hint and no longer time chosen, the previous timing stays: 2.5 seconds, or 3.3 seconds when the hint is longer than 20 characters.
 */
export function hintAdvanceDelayMs(
  showExamples: boolean,
  example: string | null | undefined,
  hintReadTime: HintReadTime,
): number {
  if (!showExamples || !example) return NO_HINT_ADVANCE_MS;
  if (hintReadTime === 'short') return 2000;
  if (hintReadTime === 'longer') return 3500;
  if (hintReadTime === 'longest') return 4500;
  return example.length > 20 ? 3300 : 2500;
}
