/** The app scrolls inside layout `<main>`, not the window. */
export function scrollAppToTop() {
  const main = document.querySelector("main");
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Put the current question and its answers in view on a short phone screen. */
export function scrollQuizQuestionIntoView() {
  const main = document.querySelector("main");
  const question = document.querySelector("[data-quiz-question]");
  const answers = document.querySelector("[data-quiz-answers]");
  if (!main || !question) {
    scrollAppToTop();
    return;
  }

  main.scrollTop = 0;
  window.scrollTo(0, 0);

  const mainTop = main.getBoundingClientRect().top;
  const questionTop = question.getBoundingClientRect().top;
  const answersBottom = (answers ?? question).getBoundingClientRect().bottom;
  const visibleBottom = Math.min(window.innerHeight, main.getBoundingClientRect().bottom) - 12;

  if (questionTop >= mainTop && answersBottom <= visibleBottom) return;

  main.scrollTop = Math.max(0, questionTop - mainTop - 8);
}
