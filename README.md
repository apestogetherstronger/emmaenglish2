# Emma English 2

A playful English–Hebrew learning app based on [Emma English](https://github.com/apestogetherstronger/emmaenglish). It runs as a static website, with no runtime packages, account setup, API keys, or application server.

## What changed

- A dark learning path with raised coral, blue, and gold activity buttons, large outlined answer tiles, mobile navigation, visible focus, and reduced-motion support.
- An English/Hebrew interface toggle in the top bar and settings. Hebrew mirrors the layout, translates feedback and progress, and localizes weekday labels while preserving the language of the vocabulary being practised. Switching languages retains the current question and selected answer.
- Separate correct/incorrect feedback sounds for quiz answers and matching attempts. Sounds are synthesized locally with Web Audio, enabled by default, and can be muted independently of spoken pronunciation.
- A default daily goal of 30 exercises, adjustable to 5/10/15/20/30. Each answered quiz question counts, including mistakes; standalone matching remains unscored. Existing ten-exercise defaults upgrade once, other saved goals are preserved, and choosing ten again in the updated settings is retained.
- Short 5/10/15/20/30-question lessons (10 by default) instead of an endless random quiz. Four choices by default; the original seven-choice challenge remains available in settings.
- Separate Everyday and Story vocabulary sets, plus a combined set. Both source dictionaries are retained verbatim. Duplicate English entries are grouped while retaining alternate translations.
- A simple spaced-review schedule prioritizes words due for another look, interleaved with new words. Errors make a word due immediately; successive correct answers extend the interval to 1, 2, 4, 7, 14, then 30 days. “Confident” means three consecutive correct answers, not an externally assessed proficiency level.
- English → Hebrew, Hebrew → English, and listening practice. Replay, slower pronunciation, and a text fallback for unavailable audio.
- Word matching as a standalone activity or an optional break after five questions. Lesson breaks reuse the words just practised. The original app's active matching game is preserved and refined; unreachable sprite/minigame code and unused media are not carried forward.
- Answers lock immediately after selection. Feedback stays on screen until Continue; no disruptive alerts or overlapping auto-advance timers.
- A searchable word collection with status filters, accuracy sorting, alternate meanings, and pronunciation.
- Real progress: daily goals, local-day streaks, accuracy, completed lessons, and seven-day activity. No sample progress or invented scores.
- CSV exports, original-app CSV imports, JSON backups, duplicate-safe history merging, and explicit confirmation before resetting progress.

## Run locally

Install Node.js 20 or later, then:

```sh
npm start
```

Open `http://localhost:8080`. No `npm install` or build is required. Opening `index.html` directly as a `file:` URL will not work because the app uses JavaScript modules and fetches local JSON files.

## Checks

```sh
npm test
npm run check
```

The tests cover vocabulary normalization, ambiguous distractors, matching, review intervals, lesson selection, CSV escaping/import/export, duplicate imports, malformed data, local-day streaks, settings migration, bilingual copy and parameters, sound muting/fallbacks, language changes during a question, and 30-question lesson completion/reloading. The static check validates the entrypoint and syntax, and checks quiz options against every word in every word set. Browser/device testing is separate; these checks do not validate visual layout or the availability of device speech voices.

## Deploy

Serve **`dist/`** from any static web host. Use the contents of that directory as the public root. All app/data references are relative, so a repository subpath such as `/emmaenglish2/` is supported. Client navigation uses URL fragments and needs no server rewrites.

The public app is published at **https://apestogetherstronger.github.io/emmaenglish2/**.

GitHub Pages serves the **`gh-pages` branch, `/` (root)**, using GitHub’s standard Pages build and deployment workflow. That branch contains the validated contents of `dist/` at its root, plus `.nojekyll` to disable Jekyll processing.

To publish a later app update, update the files on `gh-pages` with the current contents of `dist/`, retaining `.nojekyll`. Changes to `main` alone do not update the live site. Keep source, tests, and project documentation on `main`.

The `.openai/hosting.json` file identifies the companion private Sites preview; it is not required by GitHub Pages or other static hosts.

## Move your existing progress

1. In the original Emma English app, tap the score and export your answer-history CSV.
2. In Emma English 2, open **My progress → Import** and choose that CSV.
3. Future transfers can use **Backup** to include answers, completed lessons, and settings.

Different websites cannot access one another's browser storage. Existing answers are never silently copied from the original website or from its public `stats/` directory. CSV imports retain question results but cannot recover lesson boundaries that were not in the original export.

Progress is local to a browser profile on a device. Clearing site data removes it. This is not an account-based or cross-device sync service; keep a backup before changing devices. Storage failures are shown instead of silently claiming progress was saved. Simultaneous editing in multiple tabs is best-effort, not a transactional database.

The app does not upload your answers or contain analytics. Optional Google Fonts requests may occur; system fonts are fallbacks. Answer feedback uses the browser’s Web Audio API and needs no downloaded audio. Speech uses the browser's Web Speech API, and voice availability and local/remote processing depend on the device and browser. There is no guaranteed offline mode.

## Layout

```text
dist/index.html        App shell and metadata
dist/styles.css        Responsive design and interaction states
dist/app.js            Rendering, interactions, audio, and device storage
dist/core.js           Pure vocabulary, learning, and import/export logic
dist/i18n.js           English/Hebrew interface translations
dist/sounds.js         Locally synthesized answer feedback
dist/data/             Original vocabulary JSON files
scripts/               Dependency-free local server and validation
tests/                 Core behavior tests
```

The base vocabulary and story vocabulary are inherited content, not newly certified translations or CEFR-level lists. Alternate meanings are retained, and shared exact meanings are excluded as distractors; ambiguous translations can still benefit from future editorial review.

Original source inspected at commit `9fc85111cefb4876cdd38090abe708a1c60af8bd`. Source answer logs, backup files, and unused binaries were not imported into this repository.
