# UX_SPEC.md

**Project:** MicaLingo (MVP)
**Version:** 1.0

---

# 1. Overview
MicaLingo is designed to be a clean, distraction-free language learning environment. The focus is on usability, clear typography, and a mobile-first responsive design using Tailwind CSS.

# 2. Navigation
- **Top Header:** Logo on the left, language selector and login/profile on the right.
- **Mobile Menu:** Hamburger menu for smaller screens opening a side drawer.
- **Desktop Menu:** Navigation links inline or grouped neatly.

# 3. Pages
- **Home:** Welcoming interface with quick actions (Library, Quizzes, Import).
- **Library/Vocabulary:** Searchable and filterable lists of words. Includes tabs for "Open Library" and "Personalized Space".
- **Quizzes:** Categorized quiz topics (Vocabulary, Articles, Phrases, Prepositions) and custom quizzes.
- **Import:** File drop zone and format instructions.
- **Settings:** Language preferences, practice settings, and developer tools.
- **Statistics:** Progress tracking, score history.

# 4. Color Palette
- **Primary:** Blue (Tailwind `blue-600`, `blue-700`, `blue-800` for text/buttons)
- **Secondary:** Green (Tailwind `green-500` for success states, correct answers)
- **Warning/Error:** Red (Tailwind `red-500` for errors, incorrect answers)
- **Backgrounds:** Light grays and slight blue tints (`gray-50`, `blue-50`)
- **Text:** Dark grays (`gray-800`, `gray-900`)

# 5. Component Styles
- **Cards/Containers:** White backgrounds, rounded corners (`rounded-xl`), slight borders, and soft shadows.
- **Buttons:** Bold text, solid colors for primary actions, outlined or ghost for secondary actions.
- **Modals:** Centered overlays with semi-transparent black backdrops.

# 6. User Feedback
- **Loading States:** Spinners or pulsing placeholders.
- **Success/Error:** Snackbars, inline text, or distinct color changes (e.g., green for correct, red for incorrect).
- **Empty States:** Friendly illustrations or icons with calls to action (e.g., "Import Data").