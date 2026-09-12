# Emma English 2

A playful English–Hebrew learning app based on [Emma English](https://github.com/apestogetherstronger/emmaenglish). It runs as a static website, with no account setup, API keys, or application server. All app code and avatar rendering are bundled locally.

## What changed

- A dark learning path with raised coral, blue, and gold activity buttons, large outlined answer tiles, mobile navigation, visible focus, and reduced-motion support.
- An English/Hebrew interface toggle in the top bar and settings. Hebrew mirrors the layout, translates feedback and progress, and localizes weekday labels while preserving the language of the vocabulary being practised. Switching languages retains the current question and selected answer.
- Separate correct/incorrect feedback sounds for quiz answers and matching attempts, with a distinct descending two-note tone for mistakes. Each treasure tap plays a different, progressively higher chime, ending in a four-note opening flourish. Sounds are synthesized locally with Web Audio, enabled by default, and can be muted together using the sound toggle, independently of spoken pronunciation.
- A default daily goal of 30 exercises, adjustable to 5/10/15/20/30. Each answered quiz question counts, including mistakes, plus one speaking attempt per distinct sentence per day; standalone matching remains unscored. Existing ten-exercise defaults upgrade once, other saved goals are preserved, and choosing ten again in the updated settings is retained.
- Daily treasure: complete the goal and tap the illustrated chest three times to receive 40 bonus XP and one of 12 avatar collectibles. After all styles are collected, later chests give 80 XP. Each day earns at most one chest; unfinished taps and unopened chests survive reloads and remain available later. Duplicate backups do not award the same chest twice.
- A personal avatar with a nickname, hairstyles, head coverings, clothes, glasses, expressions, frames, and six custom color pickers. Free choices are available immediately; treasure rewards unlock extra hats, glasses, outfits, expressions, and glowing frames. The reward screen previews each new look and lets you wear it immediately.
- Speaking practice with 30 English sentences, Hebrew meanings, normal/slow model speech, microphone recording, recognized text, and word-by-word feedback. A new sentence attempted each day earns 5 XP; retries keep the best result without duplicating XP or daily progress. Recognition errors do not count as attempts.
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

Only if changing the bundled avatar renderer, install the pinned development dependencies and rebuild it:

```sh
npm ci
npm run build:avatar
```

Commit the updated `dist/vendor/avatar.js` and bundled license alongside the source changes. The app does not call the DiceBear API or send profile details to an avatar service.

## Checks

```sh
npm test
npm run check
```

The tests cover vocabulary normalization, quiz choices, matching, review intervals, CSV and backup merging, local-day streaks, settings migration, bilingual copy, sound fallbacks, active language switching, and 30-question lesson completion. Reward tests check three-tap claiming, reloads, duplicate backup merging, collectible ownership, and profile persistence. Speaking tests check transcript alignment, daily deduplication, permission errors, timeouts, and cancellation with simulated recognition events. The static check validates local assets and modules and checks quiz options against every word in every word set. These are Node tests and static checks; they do not validate visual layout or real device microphone/voice behavior.

## Speaking feedback

The microphone uses the browser's [SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) with English recognition. It requires a supported browser, a secure context (HTTPS or localhost), and microphone permission. Availability varies by browser and device; unsupported browsers retain model playback and sentence text.

The displayed **Words matched** score compares recognized words with the sentence, allowing ordinary punctuation, contractions, and number transcription. It checks whether the browser understood the words; it does **not** measure individual speech sounds or grade accents. Recognition itself can mishear speech. Learners can replay individual words slowly and retry.

The browser may send audio to its speech provider and may need a network connection. The app saves only the recognized transcript and result in local progress, never an audio recording. Listening stops on cancellation, navigation, settings, page hiding, or a time limit. JSON backups include the saved transcripts; answer-history CSV exports remain quiz-only.

## Deploy

Serve **`dist/`** from any static web host. Use the contents of that directory as the public root. All app/data references are relative, so a repository subpath such as `/emmaenglish2/` is supported. Client navigation uses URL fragments and needs no server rewrites.

The public app is published at **https://apestogetherstronger.github.io/emmaenglish2/**.

GitHub Pages serves the **`gh-pages` branch, `/` (root)**, using GitHub’s standard Pages build and deployment workflow. That branch contains the validated contents of `dist/` at its root, plus `.nojekyll` to disable Jekyll processing.

To publish a later app update, update the files on `gh-pages` with the current contents of `dist/`, retaining `.nojekyll`. Changes to `main` alone do not update the live site. Keep source, tests, and project documentation on `main`.

The `.openai/hosting.json` file identifies the companion private Sites preview; it is not required by GitHub Pages or other static hosts.

## Move your existing progress

1. In the original Emma English app, tap the score and export your answer-history CSV.
2. In Emma English 2, open **My progress → Import** and choose that CSV.
3. Future transfers can use **Backup** to include answers, completed lessons, settings, speaking results, avatar styling, and treasure progress. Earlier backups remain compatible.

Different websites cannot access one another's browser storage. Existing answers are never silently copied from the original website or from its public `stats/` directory. CSV imports retain question results but cannot recover lesson boundaries that were not in the original export.

Progress is local to a browser profile on a device. Clearing site data removes it. This is not an account-based or cross-device sync service; keep a backup before changing devices. Storage failures are shown instead of silently claiming progress was saved. Simultaneous editing in multiple tabs is best-effort, not a transactional database.

The app does not upload your answers or contain analytics. Optional Google Fonts requests may occur; system fonts are fallbacks. Answer feedback uses the browser’s Web Audio API and needs no downloaded audio. Speech uses the browser's Web Speech API, and voice availability and local/remote processing depend on the device and browser. There is no guaranteed offline mode.

## Layout

```text
dist/index.html        App shell and metadata
dist/styles.css        Responsive design and interaction states
dist/app.js            Rendering, interactions, audio, and device storage
dist/core.js           Pure vocabulary, learning, and import/export logic
dist/game.js           Daily chest ledger, collectible ownership, avatar validation
dist/speaking.js       Practice sentences, transcript comparison, microphone lifecycle
dist/i18n.js           English/Hebrew interface translations
dist/sounds.js         Locally synthesized answer feedback
dist/assets/           Generated closed/open treasure chest graphic
dist/vendor/           Bundled avatar renderer and its licenses
dist/data/             Original vocabulary JSON files
scripts/               Local server, validation, avatar source and bundle build
tests/                 Learning, game, speaking, and application behavior tests
```

The base vocabulary and story vocabulary are inherited content, not newly certified translations or CEFR-level lists. Alternate meanings are retained, and shared exact meanings are excluded as distractors; ambiguous translations can still benefit from future editorial review.

Avatar artwork is [Avataaars by Pablo Stanley](https://avataaars.com/), rendered with [DiceBear](https://www.dicebear.com/styles/avataaars/). The pinned library code is MIT-licensed; original code and artwork terms are retained in `dist/vendor/avatar-LICENSE.txt`. The chest sprite was generated for this app.

Original source inspected at commit `9fc85111cefb4876cdd38090abe708a1c60af8bd`. Source answer logs, backup files, and unused binaries were not imported into this repository.
