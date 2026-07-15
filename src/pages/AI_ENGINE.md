Project: LinguaForge
Version: 1.0
Purpose: Define how AI (Gemini) is used safely, consistently, and predictably in a frontend-only architecture.

1. Core Principle

AI is NOT the system.

AI is a tool inside a deterministic learning engine.

The application must always:

Try local grammar logic first
Use AI only when necessary
Validate all AI output
Never trust raw AI responses
2. Architecture Overview
2.1 Hybrid System
USER ACTION
   ↓
Frontend Logic
   ↓
LOCAL ENGINE (grammar rules, templates)
   ↓ (if insufficient)
AI ENGINE (Gemini API)
   ↓
VALIDATION LAYER
   ↓
QUIZ ENGINE OUTPUT
   ↓
UI RENDER
3. AI Usage Rules

AI is ONLY allowed to:

generate exercises
generate distractors
generate example sentences
explain grammar
paraphrase content
classify CEFR level
simplify or increase difficulty

AI is NOT allowed to:

modify stored vocabulary
delete data
overwrite user history
invent inconsistent grammar rules
change database structure
4. AI Modes
4.1 Mode A — Deterministic Local Engine (default)

Used for:

Dativ / Akkusativ drills
adjective endings
article selection
preposition exercises
verb government

Advantages:

instant
offline
consistent
no API cost
4.2 Mode B — AI Enhancement Mode

Used when:

sentence is complex
multiple grammar rules overlap
new unseen sentence appears
user uploads text/PDF/image
variation needed
4.3 Mode C — Full AI Generation Mode

Used for:

reading texts
dialogues
TELC simulation
speaking prompts
adaptive stories
5. Gemini API Integration (Frontend-only)
5.1 Direct Call Model

Frontend sends request:

fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=API_KEY", ...)

API key stored:

localStorage
IndexedDB
user settings panel

No backend exists.

5.2 Prompt Structure Standard

All prompts MUST follow this structure:

SYSTEM INSTRUCTION
You are a German grammar exercise generator.
Return ONLY valid JSON.
Do not add explanations outside JSON.
Do not format as markdown.
INPUT SECTION
Sentence:
"Ich helfe ___ Mann."

Target:
Dativ case after helfen

Level:
B1-B2
OUTPUT CONTRACT
{
  "question": "",
  "options": ["", "", "", ""],
  "correct": "",
  "grammar_topic": "",
  "difficulty": "",
  "explanation": ""
}
6. JSON Validation System

Every AI response must pass validation:

6.1 Required checks
valid JSON
no extra text
exactly 4 options (MCQ)
exactly 1 correct answer
all fields present
6.2 Failure handling

If invalid:

Retry request (max 2 times)
If still invalid → fallback local engine
Log error silently (no user disruption)
7. Prompt Engineering System
7.1 Base Prompt Template

All AI prompts are generated from templates:

ROLE:
German grammar tutor

TASK:
Generate a {quiz_type} exercise

INPUT:
{sentence_or_word}

GRAMMAR FOCUS:
{grammar_topic}

RULES:
- Must be B1-B2 level
- Must include 4 options
- Distractors must be plausible
- No random words

OUTPUT FORMAT:
STRICT JSON ONLY
7.2 Dynamic Injection

Frontend injects:

grammar type
difficulty level
user mistakes
CEFR level
previous errors

Example:

User weakness: adjective endings (40% accuracy)
Increase difficulty slightly and focus on weak area.
8. Distractor Generation Rules

AI must generate wrong answers that are:

✔ grammatically valid
✔ similar structure
✔ plausible in sentence context
❌ NOT random words
❌ NOT nonsense

Example

Sentence:

Ich helfe ___ Mann.

Correct:

dem

Distractors:

den
der
das
9. Context Injection System

AI receives additional context:

9.1 User profile context
CEFR level
weak grammar areas
error history
response speed
preferred exercise types
9.2 Learning context

Example:

User frequently confuses:
- der / den / dem
- adjective endings

AI must adapt difficulty accordingly.

10. Caching Strategy

To reduce cost and improve speed:

10.1 Cache rules

Cache AI responses when:

same sentence
same grammar topic
same difficulty
10.2 Cache storage

IndexedDB:

prompt hash
response JSON
timestamp
10.3 Cache reuse rule

If cached version exists:

→ use it instead of calling AI

11. Cost Control System
11.1 AI usage limits
limit per day (user configurable)
batch generation when possible
avoid duplicate calls
11.2 Smart batching

Instead of:

10 API calls → 10 exercises

System:

1 API call → 10 exercises

12. Error Handling Strategy
12.1 AI failure cases
invalid JSON
incomplete fields
hallucinated grammar
timeout
network error
12.2 Recovery strategy

Order:

Retry AI call
Repair JSON (auto-fix parser)
Use cached version
Use local engine fallback
Show minimal safe quiz
13. AI Consistency Rules

AI must always:

respect German grammar rules
never invent new grammar systems
never contradict earlier outputs
remain consistent across sessions
14. Learning Adaptation Input

AI receives:

last 20 mistakes
weakest grammar topics
response times
accuracy per topic

AI adjusts:

difficulty
distractor complexity
sentence length
grammar focus
15. Local vs AI Decision Matrix
Situation	Use
Simple grammar (Dativ/Akkusativ)	Local
Adjective endings	Local + AI fallback
Sentence generation	AI
TELC simulation	AI
OCR/PDF import	AI
Vocabulary quiz	Local
16. Security Constraints
API key never sent to server
stored locally only
user can reset anytime
no tracking of prompts externally
17. Future Extensions
self-hosted AI proxy
offline small LLM support
multi-model support (Gemini + OpenAI + local LLM)
teacher AI mode
shared prompt templates
End of Version 1.0