# DATABASE.md

**Project:** MicaLingo (MVP)
**Version:** 2.0 (Offline-first, rule-based)

---

# 1. Core Philosophy

The database stores **learning data**, not AI intelligence.

Everything comes from:

* user imports (Excel, TXT, copy-paste)
* manually added entries
* quiz results
* mistake tracking

No external AI dependency is required.

---

# 2. Storage Technology

Local-first storage:

* IndexedDB (via Dexie.js)
* Works fully offline
* No backend required

Optional future:

* cloud sync (NOT part of MVP)

---

# 3. Core Concept: Learning Items

Everything in the system is a **Learning Item**.

A Learning Item can be:

* vocabulary word
* sentence
* phrase
* grammar example
* quiz source item

---

# 4. Database Structure Overview

Main entities:

* LearningItem
* GrammarRule
* QuizSession
* QuizResult
* MistakeLog
* ImportSource
* Category
* Tag
* UserStats

---

# 5. LearningItem Table (CORE)

This is the most important table.

## Fields:

```text id="li1"
id (uuid)
type (word | sentence | phrase)
languageSource (German)
translationHU
translationEN (optional)

originalText
normalizedText

article (optional)
plural (optional)

verbBase (optional)
verbForms (optional)

grammarHints (optional)
caseHint (Dat / Akk / Gen / None)
preposition (optional)

difficulty (A1 / A2 / B1 / B2)
tags (array)
categoryId

sourceId

createdAt
updatedAt

masteryLevel (0–100)
timesCorrect
timesWrong
lastReviewed
nextReview
```

---

# 6. GrammarRule Table

Stores simplified grammar logic used by quiz engine.

## Fields:

```text id="gr1"
id
ruleType

examples

verb (e.g. helfen)
requiresCase (Dat / Akk / Gen)
requiresPreposition (optional)

articleRule (optional)
adjectiveRule (optional)

explanationShort

difficultyLevel
```

---

## Example rules:

* helfen → Dativ
* warten → auf + Akk
* denken → an + Akk

---

# 7. QuizSession Table

Represents one study session.

## Fields:

```text id="qs1"
id
date

itemsIncluded (array of LearningItem IDs)

totalQuestions
correctAnswers
incorrectAnswers

accuracyPercentage

weakestTopics
strongestTopics

durationSeconds
```

---

# 8. QuizResult Table

Stores each answer.

## Fields:

```text id="qr1"
id

sessionId
learningItemId

questionType (MCQ | gap | translation | reorder)

questionText

userAnswer
correctAnswer

isCorrect

responseTimeMs

grammarTopic
difficulty
```

---

# 9. MistakeLog Table

Tracks repeated errors.

## Fields:

```text id="ml1"
id

learningItemId
grammarTopic

errorType (case | article | verb | spelling)

count

lastSeen

severityScore
```

---

# 10. ImportSource Table

Tracks where data came from.

## Fields:

```text id="is1"
id

sourceType (csv | txt | excel | paste | manual)

sourceName
fileName

originalContentPreview

importDate
```

---

# 11. Category Table

Used for organization.

Examples:

* Verbs
* Nouns
* Adjectives
* Travel
* Exam (TELC)
* Netflix
* News

## Fields:

```text id="cat1"
id
name
description
```

---

# 12. Tag System

Flexible labeling system.

Examples:

* B1
* B2
* grammar
* verb
* dativ
* akkusativ
* exam

Stored as simple strings.

---

# 13. UserStats Table

Global progress tracking.

## Fields:

```text id="us1"
id

totalWordsLearned
totalSessions

averageAccuracy

strongestTopic
weakestTopic

dailyStreak
longestStreak

estimatedLevel (A1–B2)

totalTimeSpent
```

---

# 14. Optional Translation System (NO API REQUIRED)

Since no API keys are assumed:

## Option A (MVP)

* manual translation input during import

## Option B (future)

* optional Google Translate / AI API
* not part of core system

---

# 15. Data Flow

## Import → Learning System

```text id="flow1"
IMPORT FILE
   ↓
Parse text / Excel / CSV
   ↓
Create LearningItems
   ↓
Store in IndexedDB
   ↓
Quiz Engine selects items
   ↓
Generate quizzes
   ↓
Store QuizSession + Results
   ↓
Update MistakeLog + Stats
```

---

# 16. Key Design Principles

✔ Everything is local-first
✔ No backend required
✔ No external dependency required
✔ All learning data is user-owned
✔ Schema supports future AI extension
✔ Simple but extensible

---

# 17. Performance Rules

* indexing by LearningItem.type
* fast lookup by tags
* cached quiz sessions
* minimal duplication of sentences
* avoid recomputing grammar rules repeatedly

---

# 18. Future Extensions (optional only)

These are NOT required for MVP:

* OCR import
* PDF parsing
* AI translation
* AI quiz generation
* speech tracking
* cloud sync

---

# End of DATABASE.md (MVP)
