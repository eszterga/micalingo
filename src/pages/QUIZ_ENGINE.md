# FILE_FORMATS.md

**Project:** MicaLingo (MVP)

**Version:** 1.0

---

# 1. Purpose

This document defines all supported import file formats and how the application should interpret them.

The importer should be as flexible as possible while maintaining predictable behavior.

Whenever possible, the application should automatically detect the file structure.

---

# 2. Supported Formats (MVP)

Supported file types:

* TXT (.txt)
* CSV (.csv)
* Excel (.xlsx)
* Copy & Paste

Future versions may support:

* PDF (.pdf)
* Word (.docx)
* Anki Deck (.apkg)
* Subtitle files (.srt)
* JSON
* XML
* Images (OCR)

---

# 3. TXT Format

TXT files should support:

## Format A – One vocabulary item per line

Example:

```text
Haus - ház
Auto - autó
helfen - segíteni
```

---

## Format B – One sentence per line

Example:

```text
Ich helfe meinem Freund.
Heute ist schönes Wetter.
Wir fahren morgen nach Wien.
```

---

## Format C – Paragraphs

Example:

```text
Heute war ich in Wien.
Das Wetter war wunderschön.
Wir haben den ganzen Tag spazieren gegangen.
```

The importer should split paragraphs into individual sentences whenever possible.

---

# 4. CSV Format

Supported separators:

* Comma (,)
* Semicolon (;)
* Tab

The application should detect the separator automatically whenever possible.

Supported UTF-8 encoding is recommended.

---

# 5. Excel Format

Supported:

* .xlsx

The importer should read the first worksheet by default.

Future versions may allow worksheet selection.

---

# 6. Supported Column Names

The importer should recognize common column names.

## German

Examples:

* German
* Deutsch
* Wort
* Vocabulary
* Begriff

---

## Hungarian

Examples:

* Hungarian
* Magyar
* Bedeutung
* Translation
* Ungarisch

---

## English

Examples:

* English
* Englisch

---

## Example Sentence

Examples:

* Example
* Beispiel
* Satz
* Sentence

---

## Article

Examples:

* Article
* Artikel

---

## Plural

Examples:

* Plural
* Mehrzahl

---

## Verb Forms

Examples:

* Verb Forms
* Konjugation

---

## Grammar Notes

Examples:

* Notes
* Grammar
* Grammatik
* Kommentar

---

## Tags

Examples:

* Tags
* Labels
* Kategorien

---

## Category

Examples:

* Category
* Kategorie

---

# 7. Optional Columns

The following columns are optional:

* Article
* Plural
* English
* Example Sentence
* Grammar Notes
* Difficulty
* Category
* Tags
* Source
* Pronunciation
* Comments

Unknown columns should be preserved whenever possible.

---

# 8. Required Data

Minimum requirement:

At least one German word or sentence.

Translations are recommended but not required.

---

# 9. Sentence Detection

The importer should recognize sentence endings such as:

* .
* !
* ?

Paragraphs should be divided into individual sentences where appropriate.

---

# 10. Vocabulary Detection

Examples of supported layouts:

```text
Haus - ház
```

```text
Haus = ház
```

```text
Haus : ház
```

The importer should recognize common separators automatically.

---

# 11. Duplicate Detection

Duplicates may be detected by:

* German text
* German + Hungarian combination
* Exact sentence match

The user may choose to:

* Skip duplicates
* Import anyway
* Replace existing entry
* Merge with existing entry

---

# 12. Character Encoding

Preferred:

UTF-8

The importer should display a warning if unsupported encoding is detected.

---

# 13. File Validation

Before importing, validate:

* File type
* File size
* Empty file
* Number of rows
* Number of columns
* Unsupported format

If validation fails, display a clear error message.

---

# 14. Preview

Before importing, show:

* Detected format
* Number of items
* Number of columns
* Preview of the first rows
* Detected field mapping

Allow the user to modify the field mapping before import.

---

# 15. Import Mapping

The user should be able to manually assign columns.

Example:

Column A → German

Column B → Hungarian

Column C → Example Sentence

Column D → Tags

Column E → Ignore

---

# 16. Import Result

After a successful import, display:

* Total rows processed
* Imported items
* Duplicates skipped
* Errors
* Warnings
* Destination Collection

---

# 17. Future Extensions

Future versions may support:

* PDF extraction
* OCR
* AI-assisted field recognition
* Automatic translation
* Automatic grammar detection
* Multiple worksheet selection
* Batch import from folders

---

# 18. Guiding Principle

The application should accept a wide variety of file structures and automatically recognize common formats whenever possible.

Users should spend as little time as possible preparing their files before importing them.

---

# End of FILE_FORMATS.md
