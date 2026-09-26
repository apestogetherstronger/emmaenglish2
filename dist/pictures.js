import { PICTURE_STORAGE_KEY, PICTURE_WORDS, PICTURE_CATEGORIES, PICTURE_ATLASES, PICTURE_MODES, PICTURE_GOALS, createPictureStore, recordPictureAnswer, picturePool, pictureLesson, pictureChoices, pictureTotals } from './picture-core.js?v=2.13.0';
import { summarizeWords, wordStatus, localDay } from './core.js?v=2.5.0';
import { createAnswerSounds } from './sounds.js?v=2.2.1';
import { inventory, bonusProgress, pendingChests, chooseChestStyle, tapChest, equipItem, normalizeProfile, AVATAR_GROUPS, AVATAR_COLORS, REWARD_ITEMS, profileChoices } from './game.js?v=2.4.0';
import { avatarDataUri } from './vendor/avatar.js?v=2.2.0';

const $ = selector => document.querySelector(selector);
const main = $('#picture-main');
const store = createPictureStore({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
const sounds = createAnswerSounds();
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let page = 'home', session = null, picturesReady = false, pictureError = false, audioMessage = '';
let chestId = null, chestBusy = false;
const offeredChests = new Set(), avatarImages = new Map();
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const wordById = id => PICTURE_WORDS.find(w => w.id === id);
const PICTURE_VECTOR_ART = Object.freeze({
  brush: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="17" y="78" width="58" height="14" rx="7" fill="#bf7b45" transform="rotate(-28 17 78)"/><ellipse cx="76" cy="47" rx="26" ry="18" fill="#8b5e3c" transform="rotate(-28 76 47)"/><g stroke="#f4d6a6" stroke-width="3" stroke-linecap="round"><path d="M61 42l18-10M64 49l22-11M68 56l20-10M76 60l16-8"/></g></svg>`,
  fridge: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="30" y="12" width="60" height="96" rx="8" fill="#edf5f8" stroke="#6c7a89" stroke-width="4"/><path d="M30 49h60" stroke="#6c7a89" stroke-width="4"/><rect x="77" y="27" width="5" height="15" rx="2" fill="#6c7a89"/><rect x="77" y="62" width="5" height="22" rx="2" fill="#6c7a89"/><circle cx="46" cy="29" r="5" fill="#ffb454"/><rect x="51" y="59" width="12" height="9" rx="2" fill="#65b9d6"/></svg>`,
  oven: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="20" y="14" width="80" height="94" rx="10" fill="#dfe7eb" stroke="#59656f" stroke-width="4"/><circle cx="38" cy="31" r="5" fill="#59656f"/><circle cx="55" cy="31" r="5" fill="#59656f"/><circle cx="72" cy="31" r="5" fill="#59656f"/><rect x="29" y="45" width="62" height="48" rx="5" fill="#39464f"/><rect x="36" y="54" width="48" height="28" rx="3" fill="#fff0d0"/><path d="M44 73h32" stroke="#a87340" stroke-width="4"/><circle cx="51" cy="67" r="4" fill="#c99052"/><circle cx="68" cy="66" r="4" fill="#c99052"/></svg>`,
  stairs: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><path d="M18 94h20V78h18V62h18V46h18V30h12v76H18z" fill="#d9b58c" stroke="#7b674f" stroke-width="4" stroke-linejoin="round"/><path d="M26 86L91 24M26 86v14M42 70v14M58 54v14M74 38v14M91 24v14" stroke="#6c7a89" stroke-width="4" stroke-linecap="round"/></svg>`,
  garden: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="91" cy="25" r="12" fill="#ffd45a"/><path d="M0 77c24-13 47-8 62 0 21 10 39 5 58-4v47H0z" fill="#7bc96f"/><g stroke="#4b8f4a" stroke-width="4"><path d="M31 91V61M58 94V54M84 92V64"/></g><g fill="#ff6f7f"><circle cx="26" cy="58" r="7"/><circle cx="36" cy="58" r="7"/><circle cx="31" cy="51" r="7"/></g><g fill="#ffcf5c"><circle cx="53" cy="52" r="7"/><circle cx="63" cy="52" r="7"/><circle cx="58" cy="45" r="7"/></g><g fill="#a889e8"><circle cx="79" cy="61" r="7"/><circle cx="89" cy="61" r="7"/><circle cx="84" cy="54" r="7"/></g><path d="M8 79h104M17 68v36M38 67v37M82 67v37M103 66v38" stroke="#b87c4b" stroke-width="5" opacity=".7"/></svg>`,
  kitchen: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="14" y="60" width="92" height="44" rx="5" fill="#d9b58c"/><rect x="19" y="65" width="27" height="34" rx="3" fill="#f4e3cf"/><rect x="74" y="65" width="27" height="34" rx="3" fill="#f4e3cf"/><rect x="14" y="54" width="92" height="9" rx="4" fill="#7a8790"/><rect x="48" y="60" width="24" height="10" rx="5" fill="#65b9d6"/><path d="M60 56V41h14" fill="none" stroke="#59656f" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="48" r="8" fill="#f15b5b"/><path d="M22 48h16" stroke="#39464f" stroke-width="4"/></svg>`,
  bedroom: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="17" y="62" width="84" height="32" rx="7" fill="#78a7e6"/><rect x="20" y="50" width="28" height="20" rx="8" fill="#f6f0df"/><path d="M17 94v11M101 94v11" stroke="#6d5845" stroke-width="5"/><rect x="76" y="20" width="29" height="27" rx="3" fill="#9ed8ef" stroke="#6c7a89" stroke-width="3"/><path d="M90.5 20v27M76 33.5h29" stroke="#fff" stroke-width="3"/><path d="M13 61h94" stroke="#6d5845" stroke-width="5"/></svg>`,
  forest: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><path d="M0 96h120v24H0z" fill="#78b85d"/><g><path d="M26 19L5 63h14L8 82h36L33 63h14z" fill="#3e8a54"/><rect x="23" y="80" width="8" height="20" fill="#805d3f"/><path d="M61 9L36 59h16L39 81h44L68 59h16z" fill="#2f7650"/><rect x="57" y="78" width="9" height="24" fill="#805d3f"/><path d="M94 25L76 62h12L79 79h31l-10-17h12z" fill="#4b9c5a"/><rect x="91" y="77" width="7" height="22" fill="#805d3f"/></g></svg>`,
  sky: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="4" y="4" width="112" height="112" rx="18" fill="#8fd3f4"/><circle cx="84" cy="30" r="14" fill="#ffd45a"/><g fill="#fff"><circle cx="35" cy="55" r="14"/><circle cx="50" cy="49" r="18"/><circle cx="66" cy="57" r="13"/><rect x="29" y="55" width="45" height="16" rx="8"/><circle cx="72" cy="82" r="11"/><circle cx="85" cy="77" r="15"/><circle cx="99" cy="84" r="10"/><rect x="67" y="82" width="39" height="13" rx="7"/></g></svg>`,
  blocks: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g stroke="#5c6470" stroke-width="3"><rect x="20" y="61" width="34" height="34" rx="5" fill="#ff7d7d"/><rect x="58" y="61" width="34" height="34" rx="5" fill="#6fb5ee"/><rect x="39" y="23" width="34" height="34" rx="5" fill="#ffd45a"/></g><circle cx="37" cy="78" r="7" fill="#fff" opacity=".8"/><path d="M67 78h16M75 70v16" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M49 41h14" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  swing: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><path d="M18 101L38 23h44l20 78M30 52h60" fill="none" stroke="#59656f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 52v31M72 52v31" stroke="#8b5e3c" stroke-width="4"/><rect x="43" y="80" width="34" height="9" rx="4" fill="#d4874a"/></svg>`
});
function sprite(word, label = word.en) {
  if (word.art) return `<span class="picture-sprite picture-vector" data-category="${word.category}" role="img" aria-label="${escape(label)}">${PICTURE_VECTOR_ART[word.art] || ''}</span>`;
  if (word.emoji) return `<span class="picture-sprite picture-emoji" data-category="${word.category}" role="img" aria-label="${escape(label)}">${escape(word.emoji)}</span>`;
  const x = (word.cell % 4) * 100 / 3, y = Math.floor(word.cell / 4) * 100 / 3;
  const crop = word.crop;
  const style = crop ? `background-size:${1254 / crop[2] * 100}% ${1254 / crop[2] * 100}%;background-position:${crop[0] / (1254 - crop[2]) * 100}% ${crop[1] / (1254 - crop[2]) * 100}%` : `background-position:${x}% ${y}%`;
  return `<span class="picture-sprite" data-category="${word.category}" role="img" aria-label="${escape(label)}" style="${style}"></span>`;
}
const options = (values, selected) => Object.entries(values).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
function stopAudio() { if (canSpeak) window.speechSynthesis.cancel(); sounds.stop(); }
function speak(word, slow = false) {
  if (!canSpeak || !word) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(word.en);
    utterance.lang = 'en-US'; utterance.rate = slow ? 0.65 : 0.85;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'en-US') || voices.find(v => /^en\b/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onerror = event => {
      if (['canceled', 'interrupted'].includes(event.error)) return;
      audioMessage = 'Audio could not play. You can use the word on screen.';
      if (session?.question?.word.id === word.id && session.question.kind === 'listen') { session.question.revealed = true; render(); }
      else header();
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    audioMessage = 'Audio is unavailable. You can use the word on screen.';
    if (session?.question?.kind === 'listen') session.question.revealed = true;
    render();
  }
}
function header() {
  $('#picture-xp').textContent = `${pictureTotals(store.state).xp} XP`;
  $('#picture-avatar').innerHTML = avatarMarkup(store.state.game.profile, 'avatar-small');
  const sound = $('#picture-sound');
  sound.textContent = store.state.settings.effects ? 'Sounds on' : 'Sounds off';
  sound.setAttribute('aria-pressed', String(store.state.settings.effects));
  document.querySelectorAll('.picture-nav button').forEach(button => {
    if (button.dataset.action === (['words', 'profile'].includes(page) ? page : 'home')) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const notice = $('#picture-notice');
  notice.textContent = [store.message, pictureError ? 'The pictures could not load. Check your connection, then reload this page.' : '', audioMessage].filter(Boolean).join(' ');
  notice.hidden = !notice.textContent;
}
function render(focus = false) {
  header();
  if (page === 'home') renderHome();
  if (page === 'words') renderWords();
  if (page === 'lesson') renderQuestion();
  if (page === 'summary') renderSummary();
  if (page === 'profile') renderProfile();
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function categoryPicker() {
  return `<label>Word collection<select data-setting="category">${options(PICTURE_CATEGORIES, store.state.settings.category)}</select></label>`;
}
function renderHome() {
  const state = store.state, totals = pictureTotals(state), goal = state.settings.goal;
  const preview = state.settings.category === 'all' ? [wordById('cat'), wordById('apple'), wordById('sun'), wordById('teddy-bear')] : picturePool(state.settings.category).slice(0, 4);
  main.innerHTML = `${pendingChestBanner()}<div class="picture-heading"><div><h1>Learn English with pictures</h1><p>Look, listen, and choose.</p></div></div>
    <section class="picture-start"><div><div class="eyebrow">YOUR NEXT 10 WORDS</div><h2>A little practice, every day.</h2><p>Match everyday words to their pictures.</p>
      <div class="picture-controls">${categoryPicker()}<label>Practice type<select data-setting="mode">${options(canSpeak ? PICTURE_MODES : { mixed: PICTURE_MODES.mixed, read: PICTURE_MODES.read }, canSpeak ? state.settings.mode : state.settings.mode === 'listen' ? 'read' : state.settings.mode)}</select></label></div>
      <button class="primary-button" data-action="start" ${picturesReady ? '' : 'disabled'}>${picturesReady ? 'Start picture practice' : pictureError ? 'Pictures unavailable' : 'Loading pictures…'}</button>
    </div><div class="picture-preview" aria-hidden="true">${preview.map(w => sprite(w)).join('')}</div></section>
    <section class="picture-goal"><div class="picture-goal-head"><div><h2>${totals.today >= goal ? 'Daily goal complete!' : 'Your daily goal'}</h2><p>${totals.today} / ${goal} exercises today</p></div><label>Daily exercises<select data-setting="goal">${PICTURE_GOALS.map(n => `<option value="${n}" ${goal === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="progress-track" role="progressbar" aria-label="Daily exercises" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(goal, totals.today)}"><span style="width:${Math.min(100, totals.today / goal * 100)}%"></span></div><p>${totals.today >= goal ? 'Keep exploring whenever you like.' : `${Math.max(0, goal - totals.today)} more to reach your goal. Every try counts.`}</p></section>
    <div class="picture-rewards-grid">${dailyTreasureMarkup()}${bonusTreasureMarkup()}</div>
    <div class="picture-metrics"><p><strong>${totals.seen} / ${PICTURE_WORDS.length}</strong> words tried</p><p><strong>${totals.confident}</strong> confident</p><button class="secondary-button" data-action="review" ${totals.due && picturesReady ? '' : 'disabled'}>Review ${totals.due} words</button></div>
    <div class="picture-voice">${canSpeak ? `<label><input type="checkbox" data-setting="voice" ${state.settings.voice ? 'checked' : ''}> Read English prompts aloud</label>` : '<span>Spoken audio is unavailable in this browser. Picture and word practice still work.</span>'}<span>10 XP for each correct answer.</span></div>`;
}
function renderWords() {
  const stats = summarizeWords(store.state.answers), pool = picturePool(store.state.settings.category);
  main.innerHTML = `<div class="picture-heading"><div><h1>Your picture words</h1><p>${canSpeak ? 'Tap a card to hear its English word.' : 'Learn each word from its picture.'}</p></div><div class="picture-controls">${categoryPicker()}</div></div>
    <div class="picture-grid">${pool.map(w => `<${canSpeak ? 'button' : 'article'} class="picture-word-card" ${canSpeak ? `data-speak="${w.id}" aria-label="Hear ${w.en}"` : ''}>${sprite(w)}<strong>${w.en}</strong><small>${({ new: 'New word', confident: 'Confident', review: 'Try again', learning: 'Learning' })[wordStatus(stats.get(w.id))]}</small></${canSpeak ? 'button' : 'article'}>`).join('')}</div>`;
}
function startLesson(reviewOnly = false, retry = null) {
  if (!picturesReady) return;
  stopAudio();
  const queue = retry || pictureLesson(store.state, { reviewOnly });
  if (!queue.length) { page = 'home'; render(true); return; }
  session = { queue, index: 0, records: [], mode: !canSpeak && store.state.settings.mode === 'listen' ? 'read' : store.state.settings.mode, question: null };
  page = 'lesson'; nextQuestion();
}
function nextQuestion() {
  if (!session || $('#chest-dialog').open) return;
  stopAudio();
  if (session.question && !session.question.answered) return;
  if (session.question) session.index++;
  if (session.index >= session.queue.length) { page = 'summary'; render(true); offerReadyChest(); return; }
  const word = session.queue[session.index];
  const kind = session.mode === 'listen' ? 'listen' : session.mode === 'mixed' && session.index % 2 === 1 ? 'picture' : 'read';
  session.question = { word, kind, options: pictureChoices(word), answered: false, chosen: null, revealed: false };
  render(true);
  if (!offerReadyChest() && (kind === 'listen' || (kind === 'read' && store.state.settings.voice))) speak(word);
}
function renderQuestion() {
  const q = session.question, index = session.index, total = session.queue.length;
  const correct = q.chosen === q.word.id;
  const prompt = q.kind === 'picture' ? sprite(q.word, 'Which English word names this picture?') :
    `${q.kind !== 'listen' || q.revealed || q.answered ? `<strong>${q.word.en}</strong>` : ''}${canSpeak ? `<button class="secondary-button" data-action="hear">▶ ${q.kind === 'listen' ? 'Listen again' : 'Hear the word'}</button><button class="text-button" data-action="slow">Play slowly</button>` : ''}${q.kind === 'listen' && !q.revealed && !q.answered ? '<button class="text-button" data-action="reveal">Show word</button>' : ''}`;
  main.innerHTML = `<div class="picture-lesson"><div class="picture-lesson-top"><button class="text-button" data-action="home" aria-label="Finish later; answered questions stay saved">← Back</button><div class="progress-track" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${index + (q.answered ? 1 : 0)}"><span style="width:${100 * (index + (q.answered ? 1 : 0)) / total}%"></span></div><span>${index + 1} / ${total}</span></div>
    <section class="picture-question"><h1>${q.kind === 'picture' ? 'What is this?' : q.kind === 'listen' ? 'Listen. Choose the picture.' : 'Choose the picture.'}</h1><div class="picture-prompt">${prompt}</div>
    <div class="picture-options">${q.options.map(w => {
      const mark = q.answered && w.id === q.word.id ? 'correct' : q.answered && w.id === q.chosen ? 'wrong' : '';
      return `<button class="picture-option ${mark}" data-answer="${w.id}" ${q.answered ? 'disabled' : ''}>${q.kind === 'picture' ? w.en : sprite(w)}${mark ? `<span class="answer-mark">${mark === 'correct' ? '✓ Correct answer' : '× Your choice'}</span>` : ''}</button>`;
    }).join('')}</div></section>
    <div class="picture-feedback ${q.answered && !correct ? 'wrong' : ''}">${q.answered ? `<div class="picture-feedback-image">${sprite(q.word)}<div role="status"><strong>${correct ? 'That’s right! +10 XP' : 'Keep learning!'}</strong><p>${correct ? q.word.en : `The answer is ${q.word.en}.`}</p>${canSpeak ? '<button class="text-button" data-action="hear">▶ Hear it</button>' : ''}</div></div><button id="picture-next" class="primary-button" data-action="next">${index + 1 === total ? 'See my results' : 'Continue'} →</button>` : '<button class="text-button" data-action="skip">I don’t know yet</button><span class="subtle">Choose an answer · keys 1–4</span>'}</div></div>`;
}
function answer(chosen) {
  if (page !== 'lesson' || !session || session.question.answered || $('#chest-dialog').open) return;
  const q = session.question;
  if (chosen !== null && !q.options.some(w => w.id === chosen)) return;
  q.answered = true; q.chosen = chosen;
  stopAudio();
  const record = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, wordId: q.word.id, chosen, correct: chosen === q.word.id, ts: new Date().toISOString() };
  store.update(state => recordPictureAnswer(state, record));
  session.records.push(record);
  sounds.play(record.correct, store.state.settings.effects);
  render(); $('#picture-next')?.focus({ preventScroll: true });
}
function renderSummary() {
  const correct = session.records.filter(r => r.correct).length, total = session.records.length;
  const missed = session.records.filter(r => !r.correct).map(r => wordById(r.wordId));
  const totals = pictureTotals(store.state);
  main.innerHTML = `${pendingChestBanner()}<section class="picture-summary"><div class="eyebrow">LESSON COMPLETE</div><h1>${correct === total ? 'Picture perfect!' : 'More words, one step at a time.'}</h1><p>${totals.today >= store.state.settings.goal ? 'You reached your daily goal. Great work!' : `${totals.today} / ${store.state.settings.goal} exercises towards today’s goal.`}</p>
    <div class="summary-stats"><div class="summary-stat"><strong>${correct * 10}</strong><span>XP earned</span></div><div class="summary-stat"><strong>${correct} / ${total}</strong><span>correct answers</span></div></div>
    ${missed.length ? `<h2>Have another look</h2><div class="picture-grid">${missed.map(w => `<button class="picture-word-card" data-speak="${w.id}" aria-label="${canSpeak ? 'Hear' : 'Review'} ${w.en}">${sprite(w)}<strong>${w.en}</strong></button>`).join('')}</div>` : '<p>Come back tomorrow to help these words stick.</p>'}
    <div class="summary-actions">${missed.length ? '<button class="primary-button" data-action="retry">Try missed words</button>' : '<button class="primary-button" data-action="start">Another lesson</button>'}<button class="secondary-button" data-action="home">Back to practice</button></div></section>`;
}
function avatarMarkup(profile, className = 'avatar-portrait') {
  const { name, updatedAt, ...look } = profile, backdrop = profile.backdrop || 'solid';
  const key = JSON.stringify(look);
  if (!avatarImages.has(key)) {
    if (avatarImages.size >= 128) avatarImages.clear();
    avatarImages.set(key, avatarDataUri(backdrop === 'solid' ? profile : { ...profile, backgroundColor: 'transparent' }));
  }
  return `<span class="avatar-art ${className} avatar-frame-${profile.frame} avatar-backdrop-${backdrop}" aria-hidden="true"><img src="${avatarImages.get(key)}" width="280" height="280" alt="" draggable="false"></span>`;
}
function pendingChestBanner() {
  const count = pendingChests(store.state.game).length;
  return count ? `<div class="reward-banner"><span class="chest-sprite chest-mini" aria-hidden="true"></span><div><strong>Your treasure is ready!</strong><span>${count} ${count === 1 ? 'treasure' : 'treasures'} waiting</span></div><button class="secondary-button" data-action="open-chest">Open treasure</button></div>` : '';
}
function dailyTreasureMarkup() {
  const chest = store.state.game.chests.find(c => c.id === `daily:${localDay()}`), opened = chest?.taps === 3;
  const waiting = chest && pendingChests(store.state.game).some(c => c.id === chest.id);
  return `<section class="panel picture-daily-treasure"><div><span class="eyebrow">DAILY TREASURE</span><h2>${waiting ? 'You earned this!' : opened ? 'Treasure opened!' : 'A treasure awaits'}</h2><p>${waiting ? 'Tap to open your treasure.' : opened ? 'Keep practising to find bonus treasures.' : `Finish ${store.state.settings.goal} exercises to earn your chest.`}</p></div><button class="daily-chest-button" data-action="open-chest" aria-label="${waiting ? 'Open treasure' : opened ? 'Today’s treasure opened' : 'Complete your daily goal to earn this treasure'}" ${waiting ? '' : 'disabled'}><span class="chest-sprite ${opened ? 'chest-open' : ''}" aria-hidden="true"></span></button></section>`;
}
function bonusTreasureMarkup() {
  const { progress } = bonusProgress(store.state.game);
  return `<section class="panel bonus-treasure-card"><div class="bonus-treasure-heading"><span class="chest-sprite chest-mini" aria-hidden="true"></span><div><span class="eyebrow">BONUS TREASURE</span><h2>More practice. More treasures.</h2></div></div><strong class="bonus-xp-total">${progress} practice XP saved</strong><div class="progress-track" role="progressbar" aria-label="Practice XP toward a bonus chest" aria-valuemin="0" aria-valuemax="400" aria-valuenow="${Math.min(progress, 400)}"><span style="width:${Math.min(progress / 400, 1) * 100}%"></span></div><p>A bonus chest appears between 240 and 400 practice XP. Your progress carries into tomorrow.</p><details class="reward-rules"><summary>How treasures work</summary><p>Each correct answer adds 10 practice XP. Every try counts towards your daily goal.</p><p>Every chest gives 20–50 XP. These bonus points do not count towards another chest.</p><p>Your first chest includes a new avatar style. Later chests have a 20% chance. After five without a style, the next guarantees one, while styles remain.</p><p>Choose one of up to three new looks. Collect all ${REWARD_ITEMS.length} styles!</p></details></section>`;
}
function renderProfile() {
  const game = store.state.game, profile = game.profile, owned = inventory(game);
  main.innerHTML = `${pendingChestBanner()}<div class="picture-heading"><div><h1>My avatar</h1><p>Pick a look. Make it yours!</p></div></div><div class="profile-layout"><section class="profile-preview panel"><div id="avatar-preview">${avatarMarkup(profile)}</div><h2 id="avatar-display-name">${escape(profile.name || 'Picture explorer')}</h2><span class="profile-xp">${pictureTotals(store.state).xp} XP</span><label class="nickname-label" for="avatar-name">Your nickname<input id="avatar-name" maxlength="24" value="${escape(profile.name)}" placeholder="Picture explorer" autocomplete="off"></label><div class="profile-totals"><div><strong>${game.chests.filter(c => c.taps === 3).length}</strong><span>Treasures opened</span></div><div><strong>${owned.size} / ${REWARD_ITEMS.length}</strong><span>Styles unlocked</span></div></div><p class="profile-save-note">Your picture avatar and styles are saved on this device.</p></section><div class="avatar-controls"><section class="panel avatar-colors"><h2>Your colors</h2><div class="color-grid">${Object.entries(AVATAR_COLORS).map(([field, label]) => `<label>${label}<input type="color" data-avatar-color="${field}" value="#${profile[field]}"></label>`).join('')}</div></section>${Object.entries(AVATAR_GROUPS).map(([field, group]) => `<section class="panel avatar-options"><h2>${group.label}</h2>${field === 'backdrop' ? '<p class="avatar-background-note">Choose Solid color to use your background color.</p>' : ''}<div class="avatar-choice-grid" role="group" aria-label="${group.label}">${profileChoices(field, owned).map(choice => {
    const active = choice.value === profile[field];
    return `<button class="avatar-choice ${active ? 'active' : ''}" data-avatar-field="${field}" data-avatar-value="${choice.value}" aria-pressed="${active}" ${choice.locked ? 'disabled' : ''}>${avatarMarkup({ ...profile, [field]: choice.value }, 'avatar-choice-preview')}<span>${choice.label}<small>${choice.locked ? '🔒 Find in treasures' : active ? '✓ Wearing it' : choice.itemId ? 'Unlocked' : 'Try this look'}</small></span></button>`;
  }).join('')}</div></section>`).join('')}<p class="avatar-credit">Avatar art: <a href="https://avataaars.com/" target="_blank" rel="noopener noreferrer">Avataaars</a> / Pablo Stanley · <a href="https://www.dicebear.com/" target="_blank" rel="noopener noreferrer">DiceBear</a></p></div></div>`;
}
function updateAvatar(field, value, fullRender = true) {
  if (page !== 'profile' || !(field === 'name' || Object.hasOwn(AVATAR_COLORS, field) || Object.hasOwn(AVATAR_GROUPS, field))) return;
  store.update(state => ({ ...state, game: { ...state.game, profile: normalizeProfile({ ...state.game.profile, [field]: value, updatedAt: Math.max(Date.now(), state.game.profile.updatedAt + 1) }, inventory(state.game)) } }));
  header();
  if (fullRender) renderProfile();
  else { $('#avatar-preview').innerHTML = avatarMarkup(store.state.game.profile); $('#avatar-display-name').textContent = store.state.game.profile.name || 'Picture explorer'; }
}
function openChest() {
  if (chestBusy) return false;
  store.update(state => state);
  const chest = pendingChests(store.state.game)[0];
  if (!chest) { render(); return false; }
  stopAudio(); chestId = chest.id; offeredChests.add(chest.id); renderChest(); header();
  const dialog = $('#chest-dialog'); if (!dialog.open) dialog.showModal();
  return true;
}
function offerReadyChest() {
  const chest = pendingChests(store.state.game)[0];
  return chest && !offeredChests.has(chest.id) ? openChest() : false;
}
function renderChest() {
  const game = store.state.game, chest = game.chests.find(c => c.id === chestId);
  if (!chest) return;
  const opened = chest.taps === 3, item = REWARD_ITEMS.find(item => item.id === chest.itemId);
  const choosing = opened && chest.avatarPrize && !item && chest.choices.length;
  const more = pendingChests(game).some(c => c.id !== chest.id), disabled = chestBusy || !store.canSave;
  const prize = choosing ? `<section class="treasure-style-picker"><span class="eyebrow">NEW AVATAR STYLE</span><h3>Choose one style</h3><p>Pick your favorite. Other looks can appear in future treasures.</p><div class="treasure-style-choices">${chest.choices.map(id => { const choice = REWARD_ITEMS.find(candidate => candidate.id === id); return `<button class="treasure-style-option" data-reward-choice="${id}" ${disabled ? 'disabled' : ''}>${avatarMarkup({ ...game.profile, [choice.field]: choice.value }, 'reward-avatar')}<strong>${choice.label}</strong><span>Choose &amp; wear</span></button>`; }).join('')}</div></section>` : `<div class="chest-prize">${item ? avatarMarkup({ ...game.profile, [item.field]: item.value }, 'reward-avatar') : '<span class="picture-xp-star" aria-hidden="true">★</span>'}<div><span class="eyebrow">${item ? 'NEW AVATAR STYLE' : 'BONUS POINTS'}</span><h3>${item ? item.label : 'A boost for your adventure'}</h3><p>${item ? 'Yours to wear whenever you like.' : 'Your XP is added. Keep practising for more treasures!'}</p></div></div>`;
  $('#chest-dialog').innerHTML = `<div class="dialog-heading"><span class="eyebrow">${chest.kind === 'bonus' ? 'BONUS TREASURE' : 'DAILY TREASURE'}</span><button class="text-button" data-action="close-chest" aria-label="Close treasure">✕</button></div>${store.message ? `<p class="picture-notice" role="status">${escape(store.message)}</p>` : ''}<div class="chest-content"><h2 id="chest-title">${opened ? 'Treasure unlocked!' : 'You earned this!'}</h2><p>${opened ? 'A reward for learning.' : 'Tap the chest three times!'}</p><button id="chest-tap" class="treasure-tap taps-${chest.taps}" data-action="tap-chest" ${opened || disabled ? 'disabled' : ''} aria-label="Tap chest. ${3 - chest.taps} taps left."><span class="chest-sprite ${opened ? 'chest-open' : ''}" aria-hidden="true"></span></button><div class="chest-tap-progress" role="status">${opened ? `<strong class="reward-xp">+${chest.xp} XP</strong>` : `<span class="tap-pips" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${n <= chest.taps ? 'filled' : ''}"></i>`).join('')}</span><span>${chest.taps} of 3 taps</span>`}</div>${opened ? `${prize}<div class="dialog-actions">${item ? `<button class="secondary-button" data-action="wear-reward" ${disabled || game.profile[item.field] === item.value ? 'disabled' : ''}>${game.profile[item.field] === item.value ? 'Wearing it!' : 'Wear it'}</button>` : ''}${more && !choosing ? '<button class="secondary-button" data-action="open-chest">Next treasure</button>' : ''}<button class="primary-button" data-action="close-chest">${choosing ? 'Choose later' : 'Keep going'}</button></div>` : '<p class="chest-save-note">Your taps are saved. You can finish opening it later.</p>'}</div>`;
}
async function changeChest(change, playTap = false) {
  if (chestBusy || !chestId || !store.canSave) return;
  if (playTap) sounds.prepare(store.state.settings.effects);
  const id = chestId; chestBusy = true; renderChest();
  const apply = () => {
    let acceptedTap = 0;
    store.update(state => {
      if (!store.canSave) return state;
      const before = state.game.chests.find(c => c.id === id), game = change(state.game, id);
      const after = game.chests.find(c => c.id === id);
      if (playTap && before && after?.taps > before.taps) acceptedTap = after.taps;
      return { ...state, game };
    });
    if (acceptedTap) sounds.playTreasure(acceptedTap, store.state.settings.effects);
  };
  try {
    if (globalThis.navigator?.locks) await navigator.locks.request(`${PICTURE_STORAGE_KEY}:treasure`, apply);
    else apply();
  } catch { $('#picture-status').textContent = 'Your treasure could not be saved. Please try again.'; }
  finally {
    chestBusy = false; header();
    if (chestId === id) { renderChest(); const chest = store.state.game.chests.find(c => c.id === id); $(chest?.taps < 3 ? '#chest-tap' : chest?.avatarPrize && !chest.itemId ? '#chest-dialog [data-reward-choice]' : '#chest-dialog .primary-button')?.focus({ preventScroll: true }); }
    else render();
  }
}
const tapTreasure = () => changeChest((game, id) => tapChest(game, id).game, true);
const claimTreasureStyle = itemId => changeChest((game, id) => {
  const next = chooseChestStyle(game, id, itemId);
  return next === game ? game : equipItem(next, itemId, Math.max(Date.now(), game.profile.updatedAt + 1));
});
function closeChest() {
  $('#chest-dialog').close(); chestId = null; render();
  if (page === 'lesson' && !session.question.answered && (session.question.kind === 'listen' || (session.question.kind === 'read' && store.state.settings.voice))) speak(session.question.word);
}
const actions = {
  home() { stopAudio(); session = null; page = 'home'; render(true); },
  words() { stopAudio(); session = null; page = 'words'; render(true); },
  profile() { stopAudio(); session = null; page = 'profile'; render(true); },
  'open-chest': openChest, 'close-chest': closeChest, 'tap-chest': tapTreasure,
  'wear-reward': () => changeChest((game, id) => equipItem(game, game.chests.find(c => c.id === id)?.itemId, Math.max(Date.now(), game.profile.updatedAt + 1))),
  start: () => startLesson(), review: () => startLesson(true), next: nextQuestion,
  retry() { if (page === 'summary') startLesson(false, session.records.filter(r => !r.correct).map(r => wordById(r.wordId))); },
  skip: () => answer(null),
  hear: () => speak(session?.question?.word), slow: () => speak(session?.question?.word, true),
  reveal() { if (page === 'lesson') { session.question.revealed = true; render(); } },
  sound() { sounds.stop(); store.update(state => ({ ...state, settings: { ...state.settings, effects: !state.settings.effects } })); header(); },
};
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target || target.disabled) return;
  if (target.dataset.avatarField) updateAvatar(target.dataset.avatarField, target.dataset.avatarValue);
  else if (target.dataset.rewardChoice) claimTreasureStyle(target.dataset.rewardChoice);
  else if (target.dataset.action) actions[target.dataset.action]?.();
  else if (target.dataset.answer) answer(target.dataset.answer);
  else if (target.dataset.speak) speak(wordById(target.dataset.speak));
});
document.addEventListener('change', event => {
  if (event.target.dataset.avatarColor) { updateAvatar(event.target.dataset.avatarColor, event.target.value.slice(1)); return; }
  const key = event.target.dataset.setting;
  if (!['category', 'mode', 'goal', 'voice'].includes(key)) return;
  const value = key === 'voice' ? event.target.checked : key === 'goal' ? Number(event.target.value) : event.target.value;
  store.update(state => ({ ...state, settings: { ...state.settings, [key]: value } }));
  render();
});
document.addEventListener('keydown', event => {
  if ($('#chest-dialog').open || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input, select, textarea')) return;
  if (page === 'lesson' && !session.question.answered && /^[1-4]$/.test(event.key)) {
    event.preventDefault(); answer(session.question.options[Number(event.key) - 1].id);
  }
});
document.addEventListener('input', event => {
  if (event.target.dataset.avatarColor) updateAvatar(event.target.dataset.avatarColor, event.target.value.slice(1), false);
  if (event.target.id === 'avatar-name') updateAvatar('name', event.target.value, false);
});
$('#chest-dialog').addEventListener('cancel', event => { event.preventDefault(); closeChest(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
window.addEventListener('pagehide', stopAudio);
window.addEventListener('storage', event => {
  if (event.key !== PICTURE_STORAGE_KEY) return;
  store.refresh(); render(); if ($('#chest-dialog').open) renderChest();
});
// Persist the new save format and reward seed before practice; old answers keep
// their XP but do not retroactively fill the new bonus-chest meter.
store.update(state => state);
render();
// Preload every atlas before a scored exercise can start; blank images never become questions.
Promise.all(PICTURE_ATLASES.map(category => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = resolve; image.onerror = reject;
  image.src = new URL(`./assets/picture-${category}.webp?v=2.7.0`, import.meta.url).href;
}))).then(() => { picturesReady = true; render(); }).catch(() => { pictureError = true; render(); });
