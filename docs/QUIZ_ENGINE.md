# QUIZ_ENGINE.md

**Project:** MicaLingo (MVP)
**Version:** 2.0 (Rule-based system)

---

# 1. Purpose

The Quiz Engine transforms stored learning materials into interactive exercises.

It does NOT use AI.

It uses:

* grammar rules
* templates
* predefined mappings
* deterministic logic

---

# 2. Core Idea

Every learning item (word, sentence, phrase) is transformed into multiple quiz types using **rule-based templates**.

Example:

Input:

> Ich helfe dem Mann.

Output exercises:

* Flashcard
* Fill-in-the-gap
* Multiple choice
* Translation
* Error correction

---

# 3. Quiz Pipeline

```text id="qpipe1"
INPUT (word / sentence / phrase)
        ↓
Parsing Engine
        ↓
Grammar Rule Detection
        ↓
Template Selection
        ↓
Question Generation
        ↓
Distractor Generation
        ↓
Quiz Output
```

---

# 4. Quiz Types

## 4.1 Flashcard

Front:

* German word or sentence

Back:

* translation
* optional grammar note

---

## 4.2 Fill-in-the-gap (Cloze Test)

A part of the sentence is hidden.

Example:

Ich helfe ___ Mann.

Possible answers:

* dem
* den
* der
* das

---

## 4.3 Multiple Choice

One correct answer + 3 distractors.

Example:

Ich helfe ___ Mann.

A) der
B) den
C) dem
D) das

Correct: dem

---

## 4.4 Translation Quiz

* German → Hungarian
* Hungarian → German

---

## 4.5 Word Order Quiz

Words are shuffled:

Ich / helfe / dem / Mann

User must reorder correctly.

---

## 4.6 Error Correction Quiz

User sees incorrect sentence:

❌ Ich helfe den Mann
✔ Correct: Ich helfe dem Mann

User must identify or fix mistake.

---

# 5. Grammar Rule Engine (Core System)

The system uses a local rule database.

---

## 5.1 Dativ / Akkusativ Rules

Example rules:

* helfen → Dativ
* sehen → Akkusativ
* kaufen → Akkusativ
* danken → Dativ

---

## 5.2 Prepositions

Fixed mappings:

* mit → Dativ
* für → Akkusativ
* ohne → Akkusativ
* auf → Akkusativ or Dativ (context rule simplified in MVP)

---

## 5.3 Articles

Declension table:

| Case       | Masculine | Feminine | Neuter |
| ---------- | --------- | -------- | ------ |
| Nominative | der       | die      | das    |
| Accusative | den       | die      | das    |
| Dative     | dem       | der      | dem    |

---

## 5.4 Adjective Endings (Simplified MVP)

Rules:

After articles:

* der → -e / -en
* den → -en
* dem → -en
* die → -e

Example:

Ich sehe einen schön__ Hund.

Correct: schönen

---

## 5.5 Verb Government Table

Stored mapping:

* warten → auf + Akk
* denken → an + Akk
* helfen → Dat
* sprechen → mit + Dat

---

# 6. Distractor System

Wrong answers must be:

✔ grammatically valid
✔ plausible
✔ similar to correct answer
❌ NOT random words

---

## Example: Dativ

Correct: dem

Distractors:

* den
* der
* das

---

## Example: Adjective endings

Correct: schönen

Distractors:

* schöner
* schönem
* schöne

---

# 7. Template System

All quizzes are generated from templates.

---

## 7.1 Fill-in-the-gap template

```text id="tpl1"
Sentence:
{sentence}

Hide:
{target_word}

Options:
{correct_answer}
{distractors}
```

---

## 7.2 Multiple choice template

```text id="tpl2"
Question:
{sentence_with_gap}

Options:
A {option1}
B {option2}
C {option3}
D {option4}

Correct:
{correct}
```

---

# 8. Quiz Generation Rules

Each input item can generate multiple exercises:

For one sentence:

✔ Flashcard
✔ Fill-gap
✔ Multiple choice
✔ Translation
✔ Word order (if applicable)
✔ Error correction (if applicable)

---

# 9. Difficulty System (Rule-based)

Difficulty is assigned based on:

* sentence length
* number of grammar rules involved
* verb complexity
* presence of adjective endings
* number of transformations required

Levels:

A1
A2
B1
B2 (simplified detection only)

---

# 10. Adaptive Practice (No AI)

System tracks:

* wrong answers
* slow answers
* repeated mistakes

Rules:

If wrong:
→ increase frequency

If correct multiple times:
→ decrease frequency

If weak topic detected:
→ generate more of same type

---

# 11. Error Feedback System

After each answer:

* show correct answer
* show explanation (rule-based)
* show grammar rule used

Example:

Incorrect: den Mann
Correct: dem Mann

Explanation:
"helfen requires Dativ case"

---

# 12. Quiz Session Logic

A session:

1. selects items from database
2. generates quiz batch
3. presents questions
4. collects answers
5. calculates score
6. updates statistics

---

# 13. Scoring System

Each quiz session returns:

* total questions
* correct answers
* accuracy %
* weakest grammar topic
* strongest grammar topic

---

# 14. Performance Rules

* no duplicate questions in one session
* cache generated quizzes locally
* reuse templates instead of regenerating logic
* keep generation fast (<50ms per quiz if possible)

---

# 15. Future Extension Hooks (Optional)

This system is designed so AI can be added later WITHOUT rewriting:

Possible future upgrades:

* AI-generated sentences
* OCR input
* PDF parsing
* speech quizzes
* smarter distractor generation

But MVP does NOT require them.

---

# End of QUIZ_ENGINE.md (MVP)
