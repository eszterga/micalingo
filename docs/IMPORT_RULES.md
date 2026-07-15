# IMPORT_RULES.md

**Project:** MicaLingo (MVP)

**Version:** 1.0

---

# 1. Purpose

The Import System converts user-provided learning materials into structured Learning Items that can be stored in the database and used by the Quiz Engine.

The importer should be **flexible**, **forgiving**, and **easy to use**.

The user should not need to prepare files in one strict format.

---

# 2. Design Principles

The importer should:

* Accept different file formats
* Automatically detect common layouts
* Preserve as much information as possible
* Never modify the original file
* Preview data before importing
* Warn about possible problems
* Allow the user to edit detected fields before saving

---

# 3. Supported Import Sources (MVP)

Supported:

* Copy & Paste
* TXT (.txt)
* CSV (.csv)
* Excel (.xlsx)

Planned for future:

* PDF
* Word (.docx)
* Images (OCR)
* Anki Decks (.apkg)
* Subtitle files (.srt)
* Web article import

---

# 4. Import Workflow

Step 1

User selects:

* Paste text
* Upload file

↓

Step 2

System analyzes the content.

↓

Step 3

Importer detects the format.

↓

Step 4

Preview is shown.

↓

Step 5

User confirms or edits detected fields.

↓

Step 6

Data is imported into the selected Collection.

---

# 5. Automatic Format Detection

The importer should recognize common patterns.

Examples:

German | Hungarian

↓

Vocabulary table

---

German | Hungarian | Example

↓

Vocabulary table with examples

---

Long paragraphs

↓

Sentence import mode

---

One expression per line

↓

Phrase import mode

---

# 6. Flexible Column Detection

Column names should not be fixed.

Examples that should all work:

German

Deutsch

Word

Vocabulary

Begriff

---

Hungarian

Magyar

Translation

Bedeutung

Ungarisch

---

Example

Beispiel

Sentence

Satz

Examples

---

# 7. Optional Fields

The importer should recognize these columns if available.

German

Hungarian

English

Article

Plural

Verb Forms

Example Sentence

Grammar Notes

Difficulty

Tags

Category

Source

Pronunciation

Comments

Unknown columns should be preserved if possible.

---

# 8. Copy & Paste Mode

The user may paste:

Single words

Example:

```text
helfen - segíteni
Haus - ház
```

Sentence lists

```text
Ich helfe dir.
Heute ist schönes Wetter.
```

Paragraphs

Entire articles

Grammar notes

Mixed content

The importer should try to separate useful learning items.

---

# 9. Excel Import

Requirements:

Read first worksheet by default.

Display:

* Number of rows
* Number of detected columns
* Empty cells
* Duplicate rows

Allow the user to:

* Map columns manually
* Ignore columns
* Rename columns

---

# 10. CSV Import

Support:

UTF-8

Comma separated

Semicolon separated

Tab separated

Automatically detect separator whenever possible.

---

# 11. TXT Import

Possible formats:

One word per line

One sentence per line

Paragraphs

Mixed notes

The importer should detect which layout is most likely.

---

# 12. Duplicate Detection

Possible duplicate types:

Exact duplicate

Same German word

Same sentence

Same translation

Near duplicate (future)

User options:

Skip

Keep

Merge

Replace existing

---

# 13. Collection Assignment

Every imported item belongs to a Collection.

User may:

Choose existing Collection

or

Create new Collection during import.

Examples:

TELC B2

Netflix

DW Articles

Grammar

Travel

Work

My Mistakes

---

# 14. Automatic Tagging

Optional automatic tags:

Verb

Noun

Adjective

Sentence

Grammar

B1

B2

Import Date

Source

User may edit tags before importing.

---

# 15. Validation Rules

Importer should warn about:

Empty German field

Duplicate entries

Very long sentences

Unsupported characters

Missing translations

The user should still be allowed to continue.

---

# 16. Import Preview

Before importing, display:

Number of detected items

Number of duplicates

Detected columns

Detected categories

Collection

Estimated import result

Allow the user to edit individual rows before confirming.

---

# 17. Error Handling

Never crash.

If a row cannot be parsed:

Skip it.

Show a warning after import.

Provide a list of skipped rows.

---

# 18. Import Summary

After completion, display:

Items imported

Duplicates skipped

Errors

Warnings

Time taken

Destination Collection

---

# 19. Future Improvements

Possible future features:

OCR

PDF extraction

Word document import

AI-assisted field detection

Automatic translation

Automatic grammar detection

Import from Anki

Import from Quizlet

Subtitle import (.srt)

Browser extension for saving articles

---

# 20. Guiding Principle

The importer should adapt to the user's files.

The user should not have to adapt their files to the importer.

Whenever possible, the application should recognize formats automatically and ask for confirmation instead of forcing manual configuration.

---

# End of IMPORT_RULES.md
