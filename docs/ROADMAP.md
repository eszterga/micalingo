# ROADMAP.md

ok, goimg**Project:** MicaLingo (Simplified Version)

**Version:** 1.0

---

# 1. Goal

Build a web application that allows the user to:

* upload learning materials (text, Excel, PDF later)
* extract German learning content
* generate quizzes automatically
* practice interactively
* track mistakes locally

No backend required.

No external AI required for MVP.

---

# 2. Core Principle

> Everything is local-first and user-driven.

The system does NOT rely on external AI services.

Instead it uses:

* predefined grammar rules
* quiz templates
* structured parsing
* local analysis

---

# 3. Development Phases

---

# PHASE 1 — Foundation (MVP Setup)

## Goal:

Create working frontend application.

### Tasks:

* Create React + TypeScript project (Vite)
* Setup TailwindCSS
* Setup routing
* Create folder structure
* Setup IndexedDB (Dexie)
* Create basic UI layout

### Pages:

* Home
* Import
* Vocabulary list
* Quiz screen
* Results screen

---

# PHASE 2 — Import System

## Goal:

User can import materials.

### Input types:

* TXT
* CSV
* Excel (basic parsing)
* Copy-paste text

### Features:

* text segmentation
* sentence splitting
* word extraction
* vocabulary detection (basic heuristics)

---

# PHASE 3 — Vocabulary System

## Goal:

Store learning units locally.

### Features:

* add word manually
* store sentence + translation
* store grammar info
* tagging system
* categories

---

# PHASE 4 — Quiz Engine (Core)

## Goal:

Generate quizzes WITHOUT AI.

### Quiz types:

* Flashcards
* Fill-in-the-gap
* Multiple choice
* Translation
* Word ordering

---

## Grammar rules included:

* Dativ / Akkusativ
* basic adjective endings (simplified)
* article selection
* prepositions (fixed list)
* verb government (manual rules database)

---

# PHASE 5 — Basic Grammar Engine

## Goal:

Detect grammar patterns from stored data.

### Features:

* verb → case mapping table
* article rules
* preposition rules
* adjective ending templates (simplified version)

---

# PHASE 6 — Practice System

## Goal:

User can actively study.

### Features:

* quiz mode
* instant feedback
* correction explanation
* retry wrong answers

---

# PHASE 7 — Scoring System

## Goal:

Track progress locally.

### Metrics:

* correct / wrong
* accuracy %
* weakest topics
* repetition frequency

---

# PHASE 8 — Adaptive Practice (Light Version)

## Goal:

Simple adaptation without AI.

### Rules:

* wrong answers appear more often
* weak topics repeated more
* correct answers appear less often

No AI required.

---

# PHASE 9 — Polish & UX

## Goal:

Make it usable daily.

### Features:

* dark mode
* mobile layout
* smooth transitions
* keyboard support
* fast navigation

---

# PHASE 10 — Future Expansion (Optional AI)

ONLY IF USER DECIDES LATER:

* Gemini integration
* OCR from images
* PDF parsing
* smarter distractors
* sentence generation
* speaking mode

---

# 4. Non-Goals (IMPORTANT)

We explicitly DO NOT build:

* backend server
* authentication system
* cloud sync
* AI API dependency
* complex user accounts
* marketplace or sharing system

---

# 5. Success Definition

The project is successful when:

* user can import text
* system generates quizzes
* user can practice immediately
* progress is stored locally
* system runs offline
* no external services required

---

# End of ROADMAP.md
