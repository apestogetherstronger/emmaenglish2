# Emma English 2

A playful English–Hebrew learning app based on [Emma English](https://github.com/apestogetherstronger/emmaenglish). It runs as a static website, with no account setup, API keys, or application server. All app code and avatar rendering are bundled locally.

## What changed

- A dark learning path with raised coral, blue, and gold activity buttons, large outlined answer tiles, mobile navigation, visible focus, and reduced-motion support.
- An English/Hebrew interface toggle in the top bar and settings. Hebrew mirrors the layout, translates feedback and progress, and localizes weekday labels while preserving the language of the vocabulary being practised. Switching languages retains the current question and selected answer.
- Separate correct/incorrect feedback sounds for quiz answers and matching attempts, with a distinct descending two-note tone for mistakes. Each treasure tap plays a different, progressively higher chime, ending in a four-note opening flourish. Sounds are synthesized locally with Web Audio, enabled by default, and can be muted together using the sound toggle, independently of spoken pronunciation.
- A default daily goal of 30 exercises, adjustable to 5/10/15/20/30. Each answered quiz question counts, including mistakes, plus one speaking attempt per distinct sentence per day; standalone matching remains unscored. Existing ten-exercise defaults upgrade once, other saved goals are preserved, and choosing ten again in the updated settings is retained.
- One guaranteed daily chest when the configured exercise goal is completed, plus additional bonus chests at random thresholds of 240–400 practice XP. Correct quiz answers contribute 10 XP; a first speaking attempt for each sentence that day contributes 5 XP. Only exercise-earned XP advances the bonus counter. Thresholds and leftover progress persist across days, reloads, and backups; opening a daily chest does not reset the bonus counter.
- Every new chest gives 20–50 bonus XP after three taps. Avatar prizes have a 20% base chance, with a guaranteed prize after five consecutive chests without one, while unallocated styles remain. A learner's first-ever chest guarantees an avatar prize. Winners choose one of up to three unowned styles and can wear it immediately; unchosen styles remain available in future chests. Once all 36 styles are owned or promised in earned chests, further chests give XP only.
- Chests open in earning order, preserving the avatar guarantee. An unfinished style selection remains available and is completed before the next chest opens. Each reward and practice credit has a stable ID so duplicate taps, reloads, or repeated backup imports do not award it twice.
- A 36-style treasure collection, including 24 additional prizes: ten hats, hairstyles, outfits, glasses and expressions; six decorative frames; and eight patterned avatar backgrounds. Locked prizes have previews in the avatar editor. Frames, backgrounds, and clothing can be combined independently; choosing Solid color restores the saved background color. Previously earned or selected prizes and pending choices remain intact when the collection expands.
- A personal avatar with a nickname, hairstyles, head coverings, clothes, glasses, expressions, frames, and six custom color pickers. Free choices are available immediately; treasure rewards unlock extra hats, glasses, outfits, expressions, and glowing frames. The reward screen previews each new look and lets you wear it immediately.
- Speaking practice with 30 English sentences, Hebrew meanings, normal/slow model speech, microphone recording, recognized text, and word-by-word feedback. A new sentence attempted each day earns 5 XP; retries keep the best result without duplicating XP or daily progress. Recognition errors do not count as attempts.
- Short 5/10/15/20/30-question lessons (10 by default) instead of an endless random quiz. Four choices by default; the original seven-choice challenge remains available in settings.
- Separate Everyday and Story vocabulary sets, plus a combined set and a tagged Whenever, Wherever collection. All words is the default so the song vocabulary is mixed into ordinary practice. Existing dictionary entries and translations are retained, with 28 new English–Hebrew pairs added. Duplicate English entries are grouped while retaining alternate translations and tags.
- A simple spaced-review schedule prioritizes words due for another look, interleaved with new words. Errors make a word due immediately; successive correct answers extend the interval to 1, 2, 4, 7, 14, then 30 days. “Confident” means three consecutive correct answers, not an externally assessed proficiency level.
- English → Hebrew, Hebrew → English, and listening practice. Replay, slower pronunciation, and a text fallback for unavailable audio.
- Word matching as a standalone activity or an optional break after five questions. Lesson breaks reuse the words just practised. The original app's active matching game is preserved and refined; unreachable sprite/minigame code and unused media are not carried forward.
- Answers lock immediately after selection. Feedback stays on screen until Continue; no disruptive alerts or overlapping auto-advance timers.
- A searchable word collection with status filters, accuracy sorting, alternate meanings, and pronunciation.
- Real progress: daily goals, local-day streaks, accuracy, completed lessons, and seven-day activity. No sample progress or invented scores.
- CSV exports, original-app CSV imports, JSON backups, duplicate-safe history merging, and explicit confirmation before resetting progress.

## Picture mode

Open [`pictures.html`](https://apestogetherstronger.github.io/emmaenglish2/pictures.html), or choose **Picture mode** on the main learning page. It is an English-only practice space for someone who does not know Hebrew. The collection contains **144 concrete beginner words**, with familiar subjects for a five-year-old. The original 96 words remain illustrated with six locally bundled image atlases, and every collection now includes eight additional large visual emoji cards. That gives each collection 24 words while keeping the existing progress format and atlas assets compatible.

The expanded collections add:
- **Animals:** mouse, sheep, pig, chicken, duck, bear, giraffe, zebra.
- **Food:** pear, peach, lemon, corn, cucumber, cookie, sandwich, rice.
- **Everyday things:** phone, camera, umbrella, glasses, brush, scissors, ruler, box.
- **At home:** fridge, oven, shower, sink, stairs, garden, kitchen, bedroom.
- **Outside:** forest, desert, island, lake, fire, wind, earth, sky.
- **Toys & transport:** scooter, skateboard, soccer ball, blocks, guitar, yo-yo, swing, slide.

These are introductory word choices, not an assessed age or proficiency standard. Abstract words from the bilingual dictionary are not automatically mapped to pictures. Quiz distractors exclude overlapping meanings such as bird/penguin, cloud/rain, and beach/sea so a valid interpretation is not marked wrong.

Ten-question lessons offer word-to-picture, picture-to-word, and listening-to-picture questions. **Listen + pictures** works without reading English answer choices. Learners can browse the picture cards and hear each word, replay prompts slowly, retry mistakes, and review due words with the same spaced-review schedule. Spoken audio uses available English browser voices; text and pictures remain usable without speech support. All six atlases load before scored practice is enabled.

The daily goal defaults to 30, with 5/10/15/20/30 options. Each answered question counts towards the goal, and correct answers earn 10 XP. Picture mode uses **`emmaenglish2:pictures:v1`** exclusively for its settings, answer history, XP, review progress, avatar, and rewards; it never reads, resets, imports, or writes the bilingual app's **`emmaenglish2:v1`** data. Corrupt or unsupported picture saves are preserved with saving paused, and storage failures are shown to the learner. This is device-local progress, not a separate online account.

**My avatar** opens an English-only wardrobe with a picture preview for every hair, hat, outfit, glasses, expression, frame, and background choice. Learners can set a nickname and colors, wear free looks, and collect the same 36 unlockable styles as the main app. Ownership and the equipped look belong only to Picture Mode. The portrait in the header opens the wardrobe too.

Picture Mode shares the main app's reward rules: one chest for completing the daily goal, plus bonus chests at saved random thresholds of 240–400 correct-answer XP. Each chest takes three taps, with a different rising sound for each tap and a reveal animation. Every chest gives 20–50 XP; the first chest guarantees a style choice, subsequent chests have a 20% chance, and a style is guaranteed after five chests without one while unowned styles remain. A style chest offers up to three unowned looks; choose one to unlock and wear it. XP-only chests show their points without promising an accessory. Chest XP never counts towards another chest. Extra practice, pending chests, partial taps, choices, and the avatar persist across visits and merge with saved progress from another tab. Web Locks serialize treasure taps and claims where supported. The Sounds toggle also controls treasure sounds.

New chests are offered when continuing after an answer or finishing a lesson, so the answer feedback can be read first. A ready-chest banner on the practice, results, and avatar pages lets the learner return later. Opening a chest pauses question input and spoken prompts; closing it resumes an unfinished listening prompt.

Picture saves now upgrade from format 1 or 2 to format 3 when the page loads, preserving word IDs, answers, settings, and earned XP. The bonus-chest meter starts with new practice after the upgrade; old answers do not create retroactive bonus chests. An already-completed goal for the current day does earn its daily chest. Older tabs pause saving when they see the new format, protecting the new avatar and reward fields. Refresh an older tab to continue.

The picture images were generated for this app with the built-in image-generation tool, checked against their word labels, and encoded as WebP. The four-by-four cells in each atlas follow the order declared in `dist/picture-core.js`; the UI crops cells with CSS and needs no external image service. Four home words have explicit square crop bounds to keep the fork and bottle fully visible without bleeding into the row above.

## Word collections

The **Word collection** dropdown appears on the learning screen, in My words, and in settings. **All words** mixes the available vocabulary by default. The original Everyday default upgrades once to All words; explicitly choosing Everyday again, Story words, or a tagged collection is remembered.

**Whenever, Wherever** contains all 74 words requested for the song. A case-insensitive comparison against both original lists found 46 existing words and 28 missing ones. Only those 28 were added to `dictionary.json`; matching entries in both dictionaries carry the `whenever-wherever` tag. Existing translations are unchanged. Tags merge onto the same English word ID, so switching collections shares review history and does not duplicate vocabulary or XP. Inflected forms such as *way/ways*, *feet* and *legs* remain distinct entries.

The additions are: distance, foreign, existence, climb, solely, freckles, ways, feet, whenever, wherever, near, hereunder, always, ear, lips, mumble, spill, kisses, fountain, breasts, small, humble, confuse, mountains, legs, cry, again and heels. The uncommon *hereunder* has both the below-this sense and its document usage; see [Collins](https://www.collinsdictionary.com/dictionary/english/hereunder) and [Cambridge](https://dictionary.cambridge.org/us/dictionary/english/hereunder). The collection contains vocabulary only.

**Aeroplane** contains 53 deduplicated vocabulary entries from the supplied lyrics. Basic function words, pronouns, articles, conjunctions, auxiliaries, contractions, and filler such as *hey*, *just*, and *one* were omitted. *Must* was excluded as requested, alongside profanity and the references *Mazzy*, *Jane*, and the address *Lord*. Useful content words and inflected forms such as *spiked*, *sitting*, *overcoming*, and *wrote* were kept. The compound *rear-view mirror* is taught as a complete expression; *mirror* is also included on its own. Full lyrics are not stored.

Of the 53 entries, 28 already existed across the two dictionaries and received tags only, preserving every existing translation. The 25 additions are: pleasure, spiked, aeroplane, songbird, sour, someone, slap, rust, decompose, rear-view mirror, mirror, disappear, sitting, kitchen, dust, melancholy, push, overcoming, gravity, note, float, wrote, lay, choke, and throat. New Hebrew meanings include the musical sense of *note*. *Spiked* uses a figurative mixed-in/spiced sense; *lay* includes both placing something and the past of *lie* (recline). These senses were checked against Merriam-Webster: [spike](https://www.merriam-webster.com/dictionary/spike), [rearview mirror](https://www.merriam-webster.com/dictionary/rearview), and [lay](https://www.merriam-webster.com/dictionary/lay). The Hebrew wording is authored for the app.

**Shake It Off** contains 57 deduplicated words and expressions from the supplied lyrics. Of those, 38 already existed and received tags only; their translations and other metadata are unchanged. The 19 additions, each with a Hebrew translation, are: go, dates, at least, cruising, moving, players, haters, shake, shake it off, heartbreakers, fakers, on my own, moves, grooving, down and out, liars, cheats, ex-man, and fella.

Dropped final letters were restored in *cruisin’*, *movin’*, *sayin’*, *lightnin’*, *dancin’*, *groovin’*, and *gettin’*. Basic function words, auxiliaries, pronouns, contractions such as *gonna*, repeated vocalizations such as *mm-mm* and *whoo-hoo-hoo*, interjections, the address *God*, and the intensifier *hella* were omitted. Complete expressions such as *at least*, *on my own*, *down and out*, and *shake it off* retain their meaning together. *Ex-man* and *fella* have Hebrew translations marked as slang. Full lyrics are not stored.

The new Hebrew meanings are authored for the app and reflect the supplied context. Interpretations of *cruising* as progressing easily, *grooving* as dancing to the rhythm, and *shake it off* as letting something unpleasant go were checked against Merriam-Webster: [cruise](https://www.merriam-webster.com/dictionary/cruise), [groove](https://www.merriam-webster.com/dictionary/groove), and [shake off](https://www.merriam-webster.com/dictionary/shake%20off). Existing entries retain their previous translations, even where a lyric uses another sense.

The **Songs** filter combines **Whenever, Wherever**, **Aeroplane**, and **Shake It Off** into **166 unique entries** (74, 53, and 57 respectively, with overlaps). It retains the existing internal `song` identifier so saved collection choices keep working; the visible label is now plural. Every song entry carries that shared tag and its individual song tag (`whenever-wherever`, `aeroplane`, or `shake-it-off`). All four filters are available on the learning page, in My words, and in practice settings, in both interface languages. All words remains the default, so song words also appear in regular mixed practice. Tags refer to the same vocabulary IDs and answer history; changing collections never duplicates a word or awards XP. Picture Mode's vocabulary and separate progress are unaffected.

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

The tests cover vocabulary normalization, quiz choices, matching, review intervals, CSV and backup merging, local-day streaks, settings migration, bilingual copy, sound fallbacks, active language switching, and 30-question lesson completion. Reward tests check three-tap claiming, random threshold stability, overflow across days, XP isolation, duplicate backup merging, the avatar guarantee, collectible choices, full collections, and legacy prize preservation. Speaking tests check transcript alignment, daily deduplication, permission errors, timeouts, and cancellation with simulated recognition events. The static check validates local assets and modules and checks quiz options against every word in every word set. These are Node tests and static checks; they do not validate visual layout or real device microphone/voice behavior.

## Upgrading existing treasure progress

Existing earned chests retain their original 40/80 XP, promised avatar item, and tap count. Existing XP and avatar styling are preserved. The new bonus counter starts with practice completed after the update; earlier answer history is not converted into a backlog of random chests. Importing an old CSV preserves quiz XP without creating bonus credits. New JSON backups include the practice-credit ledger, fixed random seed, chest claims, and pending style choices, so restoring one resumes the same reward progress.

Saved data upgrades to format version 3; version 1 and 2 progress and backups still load. Tabs running an older app pause saving when they encounter the new format, protecting the new reward data. Refresh those tabs to continue with the updated app.

The random seed fixes bonus thresholds and chest contents on the device; it is not rerolled on reload. Avatar eligibility is decided in chest earning order, including promised prizes in unopened chests. Slot reservations prevent more unique avatar prizes being promised than available items. The 20% base chance plus the sixth-chest guarantee averages one avatar prize per approximately 3.69 chests before the collection fills, excluding the first-chest guarantee.

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
dist/game.js           Practice credit ledger, bonus thresholds, chest prizes and avatar choices
dist/speaking.js       Practice sentences, transcript comparison, microphone lifecycle
dist/i18n.js           English/Hebrew interface translations
dist/sounds.js         Locally synthesized answer feedback
dist/assets/           Generated closed/open treasure chest graphic
dist/vendor/           Bundled avatar renderer and its licenses
dist/data/             Vocabulary JSON files with collection tags
scripts/               Local server, validation, avatar source and bundle build
tests/                 Learning, game, speaking, and application behavior tests
```

The base vocabulary and story vocabulary are inherited content, not newly certified translations or CEFR-level lists. Alternate meanings are retained, and shared exact meanings are excluded as distractors; ambiguous translations can still benefit from future editorial review.

Avatar artwork is [Avataaars by Pablo Stanley](https://avataaars.com/), rendered with [DiceBear](https://www.dicebear.com/styles/avataaars/). The pinned library code is MIT-licensed; original code and artwork terms are retained in `dist/vendor/avatar-LICENSE.txt`. The chest sprite was generated for this app.

Original source inspected at commit `9fc85111cefb4876cdd38090abe708a1c60af8bd`. Source answer logs, backup files, and unused binaries were not imported into this repository.
