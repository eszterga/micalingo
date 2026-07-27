# AGENTS.md

## Cursor Cloud specific instructions

MicaLingo is a single client-side React + TypeScript + Vite web app (German exam prep). There is no backend service in this repo; auth/data use hosted Firebase (config is hardcoded in `src/lib/firebase.ts`, so no `.env` is required). `android/` and `ios/` are Capacitor wrappers and are not needed for web development.

Standard commands live in `package.json` scripts. Non-obvious notes:

- Dev server: `npm run dev` serves on port `3000` (the `--port 3000` CLI flag in the `dev` script overrides the `8080` in `vite.config.ts`). It also passes `--open`, which is harmless in a headless VM.
- Build: `npm run build` runs `tsc` (typecheck) then `vite build`, so it also validates types.
- Lint (`npm run lint`) is currently broken by a repo config issue, not the environment: the vendored `assets/package.json` (`@capacitor/assets`) contains an `eslintConfig` extending `@ionic/eslint-config/recommended`, which is not installed, and there is no root ESLint config. `eslint .` therefore fails before linting app code. Do not "fix" this as part of environment setup.
