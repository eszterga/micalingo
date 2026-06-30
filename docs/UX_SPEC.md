# UX_SPEC.md

**Project:** MicaLingo (MVP)

**Version:** 1.0

---

# 1. UX Philosophy

The application is designed for people who study languages regularly.

The user should be able to:

* start studying within a few clicks
* never feel overwhelmed
* always know what to do next
* see their progress
* enjoy learning

The interface should feel clean, modern, and distraction-free.

---

# 2. Design Principles

The application should follow these principles:

* Simple before complex
* Large clickable areas
* Clear typography
* Consistent spacing
* Fast navigation
* Minimal unnecessary animations
* Mobile-friendly
* Keyboard-friendly

---

# 3. Navigation

Main navigation should contain:

* Home
* Import
* Collections
* Vocabulary
* Grammar
* Practice
* Statistics
* Settings

Desktop:

Left sidebar

Mobile:

Bottom navigation bar or hamburger menu.

---

# 4. Home Screen

Purpose:

Quick access to studying.

Display:

* Welcome message
* Continue last session
* Start random quiz
* Recent collections
* Today's statistics
* Weakest grammar topic
* Daily study streak

Primary action:

**Start Learning**

---

# 5. Import Screen

Purpose:

Import learning materials.

Supported methods:

* Paste text
* Upload TXT
* Upload CSV
* Upload Excel
* Drag & Drop files

Display:

* File preview
* Detected language
* Detected format
* Number of words
* Number of sentences
* Number of duplicates

User options:

* Select collection
* Create new collection
* Add tags
* Skip duplicates
* Merge duplicates
* Import everything

Primary action:

**Import**

---

# 6. Collections Screen

Purpose:

Organize learning materials.

Examples:

* TELC B2
* Grammar
* Netflix
* Reading
* Podcasts
* My Mistakes
* Travel
* Work

Each collection displays:

* Number of items
* Last studied
* Progress %
* Average score

Possible actions:

* Study
* Rename
* Delete
* Export
* Merge

Primary action:

**Study Collection**

---

# 7. Vocabulary Screen

Purpose:

Browse and edit stored vocabulary.

Each item should display:

* German
* Hungarian
* Example sentence (optional)
* Grammar note (optional)
* Tags
* Collection

Functions:

* Search
* Filter
* Sort
* Edit
* Delete
* Favorite
* Mark as learned

Primary action:

**Add Vocabulary**

---

# 8. Grammar Screen

Purpose:

Review grammar rules.

Topics:

* Cases
* Articles
* Prepositions
* Verb Government
* Adjective Endings
* Passive
* Konjunktiv II

Each rule contains:

* Explanation
* Examples
* Common mistakes
* Related quizzes

Primary action:

**Practice Grammar**

---

# 9. Practice Screen

Purpose:

Run quizzes.

Before starting, user selects:

* Collection
* Quiz type
* Number of questions
* Difficulty
* Mixed mode

Quiz types:

* Flashcards
* Fill-in-the-gap
* Multiple choice
* Translation
* Word ordering
* Error correction
* Mixed quiz

Display:

* Progress bar
* Question number
* Timer (optional)
* Current score

Buttons:

* Next
* Skip
* Finish

Primary action:

**Submit Answer**

---

# 10. Results Screen

Display:

* Score (%)
* Correct answers
* Incorrect answers
* Time spent
* Weakest topics
* Strongest topics

Actions:

* Retry mistakes
* Review answers
* Repeat quiz
* Return home

Primary action:

**Practice Mistakes**

---

# 11. Statistics Screen

Display:

Overall:

* Total study time
* Total questions
* Accuracy %
* Streak
* Collections studied

Charts:

* Weekly progress
* Monthly progress
* Grammar accuracy
* Quiz history

Future charts:

* Heatmap
* Calendar
* Learning trends

Primary action:

**Continue Learning**

---

# 12. Settings Screen

Options:

General:

* Language
* Theme (Light / Dark / System)
* Font size

Practice:

* Default quiz length
* Show timer
* Shuffle questions
* Auto-repeat mistakes

Import:

* Default collection
* Duplicate handling
* Automatic tagging

Backup (future):

* Export database
* Import database

Primary action:

**Save Settings**

---

# 13. Visual Style

Appearance:

* Modern
* Minimalistic
* Spacious
* Calm

Avoid:

* Flashy colors
* Excessive gradients
* Too many icons
* Visual clutter

---

# 14. Color Palette

Suggested colors:

Primary:

Blue

Secondary:

Green

Accent:

Orange

Error:

Red

Background:

White / Dark Gray

Use high contrast for accessibility.

---

# 15. Typography

Font:

Modern sans-serif

Examples:

* Inter
* Roboto
* Open Sans

Guidelines:

* Large headings
* Comfortable line spacing
* Consistent hierarchy

---

# 16. Icons

Use one consistent icon library.

Recommended:

* Lucide React

Icons should support navigation, not replace text.

---

# 17. Accessibility

Support:

* Keyboard navigation
* Screen readers
* High contrast
* Large click targets
* Focus indicators

---

# 18. Mobile Experience

The application should behave like a native app.

Features:

* Responsive layout
* Touch-friendly controls
* Swipe support (future)
* Installable as a PWA

---

# 19. Performance

Target:

* Instant navigation
* Fast quiz loading
* Smooth scrolling
* Minimal loading indicators

---

# 20. Future UX Features

Possible future additions:

* Daily challenge
* Study reminders
* Achievement badges (optional)
* Custom themes
* Multiple languages
* AI-assisted explanations (optional)
* Cloud sync (optional)

---

# 21. Guiding Principle

Every screen should answer three questions immediately:

1. Where am I?
2. What can I do here?
3. What should I do next?

If the answer to any of these is unclear, the screen should be simplified.

---

# End of UX_SPEC.md
