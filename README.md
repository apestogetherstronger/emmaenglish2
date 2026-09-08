# Emma English 2

A calmer, more purposeful English–Hebrew learning app based on [Emma English](https://github.com/apestogetherstronger/emmaenglish). It runs as a static website, with no runtime packages, account setup, API keys, or application server.

## What changed

- A responsive study workspace with mobile navigation, clear touch targets, keyboard answer shortcuts, visible focus, Hebrew direction, and reduced-motion support.
- Short 5/10/15/20-question lessons instead of an endless random quiz. Four choices by default; the original seven-choice challenge remains available in settings.
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

The tests cover vocabulary normalization, ambiguous distractors, matching, review intervals, lesson selection, CSV escaping/import/export, duplicate imports, malformed data, local-day streaks, and settings validation. The static check validates the entrypoint and syntax, and checks quiz options against every word in every word set. Browser/device testing is separate; these checks do not validate visual layout or the availability of device speech voices.

## Deploy

Serve **`dist/`** from any static web host. Use the contents of that directory as the public root. All app/data references are relative, so a repository subpath such as `/emmaenglish2/` is supported. Client navigation uses URL fragments and needs no server rewrites.

For GitHub Pages, publish `dist/` using your preferred Pages deployment workflow. A CI/deployment workflow is intentionally not configured automatically. The `.openai/hosting.json` file identifies the companion private Sites preview; it is not required by other static hosts.

## Move your existing progress

1. In the original Emma English app, tap the score and export your answer-history CSV.
2. In Emma English 2, open **My progress → Import** and choose that CSV.
3. Future transfers can use **Backup** to include answers, completed lessons, and settings.

Different websites cannot access one another's browser storage. Existing answers are never silently copied from the original website or from its public `stats/` directory. CSV imports retain question results but cannot recover lesson boundaries that were not in the original export.

Progress is local to a browser profile on a device. Clearing site data removes it. This is not an account-based or cross-device sync service; keep a backup before changing devices. Storage failures are shown instead of silently claiming progress was saved. Simultaneous editing in multiple tabs is best-effort, not a transactional database.

The app does not upload your answers or contain analytics. Optional Google Fonts requests may occur; system fonts are fallbacks. Speech uses the browser's Web Speech API, and voice availability and local/remote processing depend on the device and browser. There is no guaranteed offline mode.

## Layout

```text
dist/index.html        App shell and metadata
dist/styles.css        Responsive design and interaction states
dist/app.js            Rendering, interactions, audio, and device storage
dist/core.js           Pure vocabulary, learning, and import/export logic
dist/data/             Original vocabulary JSON files
scripts/               Dependency-free local server and validation
tests/                 Core behavior tests
```

The base vocabulary and story vocabulary are inherited content, not newly certified translations or CEFR-level lists. Alternate meanings are retained, and shared exact meanings are excluded as distractors; ambiguous translations can still benefit from future editorial review.

Original source inspected at commit `9fc85111cefb4876cdd38090abe708a1c60af8bd`. Source answer logs, backup files, and unused binaries were not imported into this repository.
