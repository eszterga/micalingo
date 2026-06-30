# GRAMMAR_ENGINE.md

**Project:** MicaLingo (MVP)

**Version:** 1.0

---

# 1. Purpose

The Grammar Engine provides the rules and metadata required for generating grammar-based quizzes.

It is NOT an AI system.

It uses predefined grammar rules, lookup tables, and templates.

The Grammar Engine supports:

* grammar explanations
* quiz generation
* answer validation
* mistake tracking

---

# 2. Design Principles

The Grammar Engine should:

* be modular
* be easy to extend
* separate grammar rules from application code
* support different quiz types
* provide explanations for correct answers

---

# 3. Supported Grammar Topics (MVP)

The MVP should support:

* Articles
* Cases
* Dativ
* Akkusativ
* Nominativ
* Genitiv (basic support)
* Prepositions
* Verb Government
* Adjective Endings
* Separable Verbs
* Reflexive Verbs
* Modal Verbs
* Passive Voice (basic)
* Konjunktiv II (basic)

Future versions may include:

* Relative Clauses
* Indirect Speech
* Participles
* Advanced Passive
* Complex Sentence Structure

---

# 4. Articles

Supported:

Definite Articles

* der
* die
* das

Indefinite Articles

* ein
* eine

Negative Article

* kein

Possessive Articles

* mein
* dein
* sein
* ihr
* unser
* euer

Demonstrative Articles

* dieser
* jener

---

# 5. Cases

Supported cases:

* Nominativ
* Akkusativ
* Dativ
* Genitiv

Each noun should be able to store:

* gender
* case
* article
* plural form

---

# 6. Verb Government

The engine should maintain a lookup table of verbs and their required cases.

Examples:

helfen → Dativ

danken → Dativ

folgen → Dativ

gefallen → Dativ

sehen → Akkusativ

kaufen → Akkusativ

besuchen → Akkusativ

fragen → Akkusativ

---

# 7. Prepositions

Store fixed prepositions and their required cases.

Examples:

mit → Dativ

bei → Dativ

nach → Dativ

von → Dativ

zu → Dativ

für → Akkusativ

ohne → Akkusativ

durch → Akkusativ

gegen → Akkusativ

um → Akkusativ

Wechselpräpositionen (basic support):

* an
* auf
* hinter
* in
* neben
* über
* unter
* vor
* zwischen

These should support both Dativ and Akkusativ depending on context.

---

# 8. Adjective Endings

Support three declension types:

* Strong
* Weak
* Mixed

The engine should know:

* article type
* noun gender
* grammatical case
* number

The quiz engine should be able to generate adjective ending exercises from these rules.

---

# 9. Separable Verbs

Store:

* infinitive
* prefix
* stem

Examples:

aufstehen

einkaufen

mitkommen

fernsehen

The engine should support:

* present tense
* Perfekt
* infinitive with "zu"

---

# 10. Reflexive Verbs

Store:

* reflexive pronoun
* required case
* optional preposition

Examples:

sich freuen auf

sich erinnern an

sich interessieren für

sich beeilen

---

# 11. Modal Verbs

Support:

* können
* dürfen
* müssen
* sollen
* wollen
* mögen

The quiz engine should generate:

* conjugation exercises
* sentence completion
* translation tasks

---

# 12. Passive Voice

Basic support.

Recognize:

werden + Partizip II

Generate simple exercises such as:

Transform active → passive.

---

# 13. Konjunktiv II

Basic support.

Recognize common forms such as:

* würde
* hätte
* wäre
* könnte
* müsste
* sollte
* dürfte

Generate exercises involving:

* hypothetical situations
* polite requests
* wishes

---

# 14. Grammar Metadata

Every grammar rule should contain:

* unique ID
* topic
* explanation
* examples
* difficulty level
* related quiz types

---

# 15. Grammar Difficulty

Each rule should be assigned:

A1

A2

B1

B2

Future:

C1

C2

This allows filtering quizzes by language level.

---

# 16. Grammar Explanations

Each grammar rule should contain:

* short explanation
* detailed explanation (optional)
* examples
* common mistakes
* related rules

These explanations are shown after incorrect answers.

---

# 17. Quiz Integration

The Grammar Engine should provide information for:

* Fill-in-the-gap
* Multiple Choice
* Error Correction
* Translation
* Word Order

Grammar rules should determine:

* the correct answer
* acceptable alternatives (if applicable)
* distractors

---

# 18. Mistake Tracking

Track mistakes by grammar topic.

Examples:

* Dativ
* Akkusativ
* Articles
* Adjective Endings
* Verb Government

Repeated mistakes should increase the probability of receiving similar exercises.

---

# 19. Future Extensions

Possible future additions:

* Automatic grammar detection
* AI-generated explanations
* Pronunciation feedback
* Grammar recommendations
* Personalized learning paths

These features are outside the MVP.

---

# 20. Guiding Principle

The Grammar Engine should serve as the central source of grammatical knowledge for the application.

All grammar-based quizzes should rely on these predefined rules to ensure consistent behavior and make the system easy to maintain and expand.

---

# End of GRAMMAR_ENGINE.md
