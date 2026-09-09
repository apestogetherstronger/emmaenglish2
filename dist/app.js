import { translate, locale, dayLabel } from './i18n.js?v=2.1.0';
import { createAnswerSounds } from './sounds.js?v=2.1.0';
import { STORAGE_KEY, DEFAULT_SETTINGS, createState, normalizeSettings, normalizeDictionary, forPack, shuffled, summarizeWords, wordStatus, selectLesson, buildChoices, selectPairs, answerRecord, cleanAnswers, mergeAnswers, parseCSV, toCSV, streakDays, weekActivity, localDay, wordId } from './core.js?v=2.1.0';

const $ = (selector, root = document) => root.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  learn: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M12 5v16m0-16C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
  chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8v-5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/>',
  fire: '<path d="M13 3c1 5-4 5-2 10 2-1 3-3 3-5 4 3 5 5 5 8a7 7 0 0 1-14 0c0-4 3-5 3-8 1 1 2 2 2 3 2-3 0-5 3-8Z"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m-6 0 6-6"/>',
  headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="12" width="5" height="9" rx="2"/><rect x="17" y="12" width="5" height="9" rx="2"/>',
  swap: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',
  match: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/><path d="m5 12 1 1 2-3m8 2 1 1 2-3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  retry: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-5 8-8 9-3-1-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v6m-4 1h8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
const icons = () => document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const packNames = { everyday: 'Everyday words', stories: 'Story words', all: 'All words' };
const statusNames = { new: 'New', learning: 'Learning', review: 'Needs practice', confident: 'Confident' };
let state = createState(), words = [], stats = new Map(), loadWarning = '', storageWarning = '';
let view = 'learn', session = null, match = null, summary = null;
let wordQuery = '', wordFilter = 'all', wordSort = 'practice', wordPage = 0;
let toastTimer, confirmCallback = null, ready = false;
const t = (key, values) => translate(state.settings.language, key, values);
const answerSounds = createAnswerSounds(window);
const packName = key => t(packNames[key]);
const statusName = key => t(statusNames[key]);
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const main = $('#main');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.version !== 1) throw new Error('Unknown data version');
    state = { ...createState(), settings: normalizeSettings(data.settings), answers: cleanAnswers(data.answers), sessions: cleanSessions(data.sessions) };
    state.answers = mergeAnswers([], state.answers);
  } catch {
    storageWarning = 'Saved progress could not be read and has not been overwritten. Download a recovery backup, then import a valid backup or reset progress.';
    // Keep the unreadable value intact; further writes are blocked until an explicit reset/import.
    state = createState(); persistenceBlocked = true;
  }
}
let persistenceBlocked = false;
function cleanSessions(list) {
  return Array.isArray(list) ? list.filter(s => s && typeof s.id === 'string' && s.id.length < 100 && Number.isFinite(Date.parse(s.completedAt)) && Number.isInteger(s.total) && s.total > 0 && s.total <= 30 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.total)
    .map(s => ({ id: s.id, completedAt: new Date(s.completedAt).toISOString(), total: s.total, correct: s.correct })) : [];
}
function persist() {
  if (persistenceBlocked) { toast('Saving is paused because previous progress could not be read. See My progress.'); return false; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageWarning = ''; return true; }
  catch { storageWarning = 'Your browser could not save the latest progress. Keep this tab open and download a backup from My progress.'; toast('Progress is only in this tab for now. Download a backup to keep it.'); return false; }
}
function refreshStats() { stats = summarizeWords(state.answers); }
function todayCount() { return state.answers.filter(a => localDay(a.ts) === localDay()).length; }
function currentPool() { return forPack(words, state.settings.pack); }
function dueWords(pool = currentPool()) { return pool.filter(w => stats.has(w.id) && stats.get(w.id).due <= Date.now()); }
function toast(message) {
  clearTimeout(toastTimer); const el = $('#toast'); el.textContent = t(message); el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, 6500);
}
function speak(text, language = 'en-US', manual = false, slow = false) {
  if (!canSpeak) { if (manual) toast('Pronunciation is not available in this browser. You can still practise with the words on screen.'); return; }
  if (!state.settings.sound && !manual) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language; utterance.rate = slow ? 0.65 : state.settings.rate;
  const candidates = speechSynthesis.getVoices();
  utterance.voice = candidates.find(v => v.lang === language && v.localService) || candidates.find(v => v.lang === language) || candidates.find(v => v.lang.startsWith(language.slice(0, 2))) || null;
  utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) toast('Audio could not play. Try replay, or use “Show word” in a listening lesson.'); };
  speechSynthesis.speak(utterance);
}
function cancelSpeech() { if (canSpeak) speechSynthesis.cancel(); }
function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div'); el.className = 'confetti'; el.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('span'); p.style.left = `${Math.random() * 100}%`;
    p.style.background = ['#ff4b55', '#ffc800', '#58cc02', '#49c0f8'][i % 4]; p.style.animationDelay = `${Math.random() * 0.35}s`; el.append(p);
  }
  document.body.append(el); setTimeout(() => el.remove(), 2100);
}
function packOptions(value) { return Object.entries(packNames).filter(([key]) => forPack(words, key).length).map(([key, name]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${t(name)}</option>`).join(''); }
function noticeMarkup() {
  return [storageWarning, loadWarning].filter(Boolean).map(t => `<div class="notice">${icon('info')}<span>${escape(typeof t === 'string' ? translate(state.settings.language, t) : translate(state.settings.language, 'The {pack} list could not load. You can still practise the available words. Refresh to try again.', { pack: packName(t.pack) }))}</span></div>`).join('');
}
function applyLanguage() {
  const language = state.settings.language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  document.title = `Emma English · ${t('Your daily adventure')}`;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  const toggle = $('#language-toggle');
  toggle.textContent = language === 'en' ? 'עברית' : 'English';
  toggle.lang = language === 'en' ? 'he' : 'en';
  toggle.dir = language === 'en' ? 'rtl' : 'ltr';
  toggle.setAttribute('aria-label', language === 'en' ? 'Switch interface to Hebrew' : 'החלפת שפת הממשק לאנגלית');
  const sound = $('#sound-toggle');
  sound.innerHTML = icon(state.settings.effects ? 'sound' : 'mute');
  sound.setAttribute('aria-label', t(state.settings.effects ? 'Turn answer sounds off' : 'Turn answer sounds on'));
  sound.setAttribute('aria-pressed', String(state.settings.effects));
}
function header() {
  applyLanguage();
  const streak = streakDays(state.answers), xp = state.answers.filter(a => a.correct).length * 10;
  $('#streak-pill').innerHTML = `${icon('fire')}<span>${streak}</span><span class="sr-only">${t('day streak')}</span>`;
  $('#xp-pill').innerHTML = `${icon('star')}<span>${xp.toLocaleString(locale(state.settings.language))}</span><span class="stat-unit">XP</span>`;
  document.body.classList.toggle('in-practice', ['lesson', 'match'].includes(view));
  document.querySelectorAll('[data-page]').forEach(a => {
    if (a.dataset.page === (['lesson', 'match', 'summary'].includes(view) ? 'learn' : view)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function render(focus = false) {
  header();
  if (view === 'learn') renderHome();
  if (view === 'lesson') renderLesson();
  if (view === 'match') renderMatch();
  if (view === 'summary') renderSummary();
  if (view === 'words') renderWords();
  if (view === 'progress') renderProgress();
  icons();
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function navigate(page) {
  const destination = ['learn', 'words', 'progress'].includes(page) ? page : 'learn';
  const go = () => { cancelSpeech(); session = null; match = null; view = destination; history.replaceState(null, '', `#${destination}`); render(true); };
  if (session || (match && !match.complete)) confirmAction('Leave this practice?', 'The answers you have already given will stay in your progress.', 'Leave practice', go);
  else go();
}
function renderHome() {
  const today = todayCount(), goal = state.settings.goal, percent = Math.min(1, today / goal);
  const due = dueWords().length, pool = currentPool(), count = Math.min(state.settings.questions, pool.length);
  const featured = pool.find(w => w.id === 'curious') || pool.find(w => w.id === 'discover') || pool[0];
  const steps = [
    { action: 'start', symbol: 'star', title: t(state.answers.length ? 'Continue learning' : 'Start a lesson'), detail: t('{count} questions', { count }), color: 'coral', current: true },
    { action: 'listen', symbol: 'headphones', title: t('Listen & learn'), detail: t(canSpeak ? 'Hear it. Know it.' : 'Audio unavailable here'), color: 'blue', disabled: !canSpeak },
    { action: 'reverse', symbol: 'swap', title: t('Flip the words'), detail: t('Hebrew to English'), color: 'coral' },
    { action: 'match', symbol: 'match', title: t('Make a match'), detail: t('Find the word pairs'), color: 'gold' },
  ];
  main.innerHTML = `${noticeMarkup()}<div class="learning-layout"><section class="path-panel" aria-label="${t('Your learning path')}">
    <div class="path-heading"><h1>${t('Your learning path')}</h1><label class="sr-only" for="home-pack">${t('Your word set')}</label><select id="home-pack" data-change="pack">${packOptions(state.settings.pack)}</select></div>
    <div class="unit-banner"><div><div class="eyebrow">${t('DAILY PRACTICE')}</div><h2>${t(today >= goal ? 'Goal complete! Keep exploring' : 'Let’s keep learning')}</h2></div><span class="unit-symbol">${icon('book')}</span></div>
    <div class="path-progress"><span>${t('{count} exercises today', { count: today })}</span><strong><bdi>${Math.min(today, goal)} / ${goal}</bdi></strong><div class="progress-track" role="progressbar" aria-label="${t('Daily goal')}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(today, goal)}"><span style="width:${percent * 100}%"></span></div></div>
    <div class="learning-path">${steps.map((step, i) => `<div class="path-stop stop-${i} ${step.color}">${step.current ? `<span class="start-bubble">${t('YOUR NEXT STEP')}</span>` : ''}<button class="path-node ${step.current ? 'current' : ''}" data-action="${step.action}" aria-label="${escape(step.title)}" ${step.disabled ? 'disabled' : ''}>${icon(step.symbol)}</button><div class="path-label"><strong>${step.title}</strong><span>${step.detail}</span></div></div>`).join('')}
      <div class="path-finish ${today >= goal ? 'reached' : ''}"><div class="finish-icon">${icon('trophy')}</div><strong>${t(today >= goal ? 'Daily goal complete. Nice work!' : '{count} exercises per day', { count: goal })}</strong></div>
    </div>
    </section><aside class="learning-rail">
      <section class="goal-card"><div class="goal-label">${icon('target')}<h2>${t('Daily goal')}</h2><button class="text-button" data-action="settings">${t('Change goal')}</button></div><div class="goal-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="51"/><circle class="ring-fill" cx="60" cy="60" r="51" stroke-dasharray="320.44" stroke-dashoffset="${320.44 * (1 - percent)}"/></svg><div class="goal-value"><bdi>${today}<small> / ${goal}</small></bdi><span>${t('Exercises')}</span></div></div><p>${t(today >= goal ? 'Daily goal complete. Nice work!' : '{count} more to reach your goal', { count: Math.max(0, goal - today) })}</p></section>
      <section class="review-card"><span class="card-icon">${icon('retry')}</span><h2>${t('Ready for a review?')}</h2><p>${due ? t('{count} words ready for another try', { count: due }) : t('Your next review will appear here.')}</p><button class="secondary-button" data-action="${due ? 'review' : 'words'}">${t(due ? 'Practise' : 'My words')} ${icon('arrow')}</button></section>
      <section class="word-spotlight"><div class="eyebrow">${t('WORD SPOTLIGHT')}</div><div class="spotlight-word"><strong lang="en" dir="ltr">${escape(featured.en)}</strong><button class="icon-button" data-speak="${escape(featured.id)}" aria-label="${escape(t('Hear {word}', { word: featured.en }))}">${icon('sound')}</button></div><span lang="he" dir="rtl">${escape(featured.he)}</span></section>
    </aside></div>`;
}
function startLesson(mode = 'translate', reviewOnly = false, overrideWords = null) {
  const pool = currentPool();
  const queue = overrideWords || selectLesson(pool, stats, state.settings.questions, { reviewOnly });
  if (!queue.length) { toast('Nothing is due for review yet. Try a new lesson, or come back tomorrow.'); return; }
  if (mode === 'listen' && !canSpeak) { toast('Listening is not supported in this browser.'); return; }
  session = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, mode, queue, pool, index: 0, records: [], current: null, bonusShown: false, bonus: state.settings.bonus, choices: state.settings.choices };
  summary = null; prepareQuestion(); view = 'lesson'; render(true);
  pronounceQuestion();
}
function prepareQuestion() {
  const word = session.queue[session.index];
  session.current = { word, options: buildChoices(word, session.pool, session.choices, session.mode === 'reverse'), answered: false, chosen: null, correct: false, revealed: false, start: performance.now() };
}
function pronounceQuestion() {
  if (session.mode === 'listen') speak(session.current.word.en, 'en-US', true);
  else if (session.mode === 'translate') speak(session.current.word.en);
}
function lessonTop(label, progress, score) {
  return `<div class="lesson-top"><button class="icon-button" data-action="leave" aria-label="${t('Leave practice')}">${icon('close')}</button><div class="lesson-progress-wrap"><div class="lesson-progress-label"><span>${label}</span><bdi>${Math.round(progress)}%</bdi></div><div class="progress-track" role="progressbar" aria-label="${t('Lesson progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div></div><div class="lesson-score">${icon('star')}<bdi>${score} XP</bdi></div></div>`;
}
function renderLesson() {
  const { current: q, index, queue, mode, records } = session;
  const { word, answered, correct, options, chosen } = q, reverse = mode === 'reverse', listening = mode === 'listen';
  const target = reverse ? word.en : word.he, prompt = reverse ? word.he : word.en;
  main.innerHTML = `<div class="lesson-shell">${lessonTop(t('Question {current} of {total}', { current: index + 1, total: queue.length }), records.length / queue.length * 100, records.filter(a => a.correct).length * 10)}
    <section class="question-card" aria-labelledby="question-instruction"><span class="break-label">${icon(listening ? 'headphones' : 'star')}${t('DAILY PRACTICE')}</span><h1 id="question-instruction">${t(listening ? 'Listen. What does the word mean?' : reverse ? 'Choose the English meaning' : 'Choose the Hebrew meaning')}</h1>
      ${listening && !q.revealed && !answered ? `<div class="prompt-row"><button class="listen-button" data-action="replay" aria-label="${t('Play the English word')}">${icon('sound')}</button></div><div class="listen-label"><button class="text-button" data-action="slow">${t('Play slowly')}</button><span aria-hidden="true">·</span><button class="text-button" data-action="reveal">${t('Show word')}</button></div>` : `<div class="prompt-row"><div class="prompt-word" lang="${reverse ? 'he' : 'en'}" dir="${reverse ? 'rtl' : 'ltr'}">${escape(prompt)}</div><button class="icon-button" data-action="replay" aria-label="${escape(t('Hear {word}', { word: prompt }))}">${icon('sound')}</button></div>`}
      <div class="choices" role="group" aria-label="${t('Answer choices')}">${options.map((option, i) => {
        const isCorrect = option === target, style = answered ? isCorrect ? 'correct' : chosen === option ? 'wrong' : 'faded' : '';
        return `<button class="choice ${style}" data-choice="${i}" ${answered ? 'disabled' : ''}><span class="choice-key" aria-hidden="true">${i + 1}</span><span class="choice-label" lang="${reverse ? 'en' : 'he'}" dir="${reverse ? 'ltr' : 'rtl'}">${escape(option)}</span>${answered && (isCorrect || chosen === option) ? icon(isCorrect ? 'check' : 'close') : ''}</button>`;
      }).join('')}</div><p class="quiz-helper">${t(answered ? 'Take a moment to remember this one.' : 'Choose one answer. Take your time.')}</p>
    </section><div class="lesson-bottom ${answered ? correct ? 'is-correct' : 'is-wrong' : ''}">${answered ? `<div class="feedback" role="status"><span class="feedback-icon">${icon(correct ? 'check' : 'close')}</span><div><strong>${t(correct ? ['You’ve got it!', 'That’s the one!', 'Nicely done!'][index % 3] : 'A new word to remember.')}</strong><p><bdi lang="en">${escape(word.en)}</bdi> <span aria-hidden="true">=</span> <bdi lang="he">${escape(word.translations.join(' / '))}</bdi></p></div></div><button id="continue-button" class="primary-button" data-action="next">${t(index + 1 === queue.length ? 'See my results' : 'Continue')} ${icon('arrow')}</button>` : `<button class="secondary-button" data-action="skip">${t('I don’t know yet')}</button><span class="keyboard-hint">${t(listening ? 'Tap the speaker to listen again' : 'Keyboard: {keys}', { keys: options.map((_, i) => i + 1).join('–') })}</span>`}</div></div>`;
}
function answer(index) {
  if (view !== 'lesson' || !session || session.current.answered) return;
  const q = session.current, chosen = index === null ? '' : q.options[index];
  if (typeof chosen !== 'string') return;
  // Lock before any side effect so double taps and key repeats cannot score twice.
  q.answered = true; q.chosen = chosen; q.correct = chosen === (session.mode === 'reverse' ? q.word.en : q.word.he);
  const record = answerRecord(q.word, chosen, q.correct, session.mode, performance.now() - q.start);
  session.records.push(record); state.answers.push(record); refreshStats(); persist(); cancelSpeech(); answerSounds.play(q.correct, state.settings.effects);
  renderLesson(); header(); $('#continue-button')?.focus({ preventScroll: true });
}
function nextQuestion() {
  if (!session?.current.answered || view !== 'lesson') return;
  if (session.index + 1 >= session.queue.length) { completeLesson(); return; }
  if (session.bonus && !session.bonusShown && session.records.length === 5 && session.queue.length > 5) {
    session.bonusShown = true;
    startMatch(true); return;
  }
  session.index++; prepareQuestion(); render(true); pronounceQuestion();
}
function completeLesson() {
  cancelSpeech();
  summary = { mode: session.mode, records: [...session.records], words: [...session.queue] };
  state.sessions.push({ id: session.id, completedAt: new Date().toISOString(), total: session.queue.length, correct: session.records.filter(r => r.correct).length });
  persist(); session = null; match = null; view = 'summary'; render(true); confetti();
}
function startMatch(isBonus = false) {
  let candidates = currentPool();
  if (isBonus) candidates = [...session.records.map(r => words.find(w => w.id === r.wordId)).filter(Boolean), ...currentPool()];
  // For a lesson break, choose from the words just practised before filling spare slots.
  const selected = isBonus ? selectPairs(candidates, 4, () => 0.999999) : selectPairs(candidates, 4);
  if (selected.length < 2) { toast('This word set needs at least two distinct pairs.'); if (isBonus) { session.index++; prepareQuestion(); view = 'lesson'; render(true); pronounceQuestion(); } return; }
  match = { pairs: selected, left: shuffled(selected), right: shuffled(selected), selected: null, matched: new Set(), wrong: null, complete: false, bonus: isBonus, moves: 0, status: 'Choose a word, then its match on the other side.' };
  cancelSpeech(); view = 'match'; render(true);
}
function renderMatch(focusKey = null) {
  const m = match;
  const column = (items, side) => `<div class="match-column"><div class="match-column-title">${t(side === 'en' ? 'English' : 'Hebrew')}</div>${items.map(w => {
    const key = `${side}:${w.id}`;
    const classes = [m.matched.has(w.id) ? 'matched' : '', m.selected?.key === key ? 'selected' : '', m.wrong === key ? 'mismatch' : ''].join(' ');
    return `<button class="pair-button ${classes}" data-pair="${escape(key)}" data-side="${side}" data-word="${escape(w.id)}" aria-pressed="${m.selected?.key === key}" ${m.matched.has(w.id) ? 'disabled' : ''}><span lang="${side}" dir="${side === 'he' ? 'rtl' : 'ltr'}">${escape(w[side])}</span>${m.matched.has(w.id) ? icon('check') : ''}</button>`;
  }).join('')}</div>`;
  main.innerHTML = `<div class="lesson-shell matching-shell">${lessonTop(t(m.bonus ? 'A little word break' : 'Make a match'), m.matched.size / m.pairs.length * 100, m.bonus ? session.records.filter(r => r.correct).length * 10 : 0)}<section class="question-card"><span class="break-label">${icon('star')}${t(m.bonus ? 'HALFWAY THERE' : 'WARM-UP')}</span><h1>${t('Tap the matching pairs')}</h1><p class="question-description">${t('Match each English word to its Hebrew meaning.')}</p><div class="match-grid">${column(m.left, 'en')}${column(m.right, 'he')}</div><div class="match-status" role="status">${t(m.status)}</div></section><div class="lesson-bottom"><span class="subtle">${t('{found} of {total} pairs found', { found: m.matched.size, total: m.pairs.length })}${m.moves ? ` · ${t('{count} tries', { count: m.moves })}` : ''}</span>${m.complete ? `<button class="primary-button" data-action="match-done">${t(m.bonus ? 'Back to my lesson' : 'Play again')} ${icon('arrow')}</button>` : `<button class="secondary-button" data-action="${m.bonus ? 'skip-match' : 'home'}">${t(m.bonus ? 'Skip this break' : 'Back to learning')}</button>`}</div></div>`;
  if (focusKey) [...main.querySelectorAll('[data-pair]')].find(b => b.dataset.pair === focusKey && !b.disabled)?.focus({ preventScroll: true });
}
function choosePair(button) {
  const { side, word: id, pair: key } = button.dataset;
  if (!match || match.complete || match.matched.has(id)) return;
  match.wrong = null;
  if (!match.selected || match.selected.side === side) {
    match.selected = match.selected?.key === key ? null : { side, id, key };
    match.status = match.selected ? 'Now find its partner on the other side.' : 'Choose a word, then its match on the other side.';
    if (side === 'en' && match.selected) speak(match.pairs.find(w => w.id === id).en);
  } else {
    match.moves++; cancelSpeech(); answerSounds.play(match.selected.id === id, state.settings.effects);
    if (match.selected.id === id) {
      match.matched.add(id); match.selected = null; match.status = 'That’s a match. Keep going!';
      if (match.matched.size === match.pairs.length) { match.complete = true; match.status = 'All together! You found every pair.'; confetti(); }
    } else { match.wrong = key; match.status = 'Not quite. Keep your first word and try another partner.'; }
  }
  renderMatch(key);
  if (match.complete) $('[data-action="match-done"]')?.focus({ preventScroll: true });
}
function finishMatch() {
  const bonus = match?.bonus; match = null;
  if (bonus && session) { session.index++; prepareQuestion(); view = 'lesson'; render(true); pronounceQuestion(); }
  else startMatch();
}
function renderSummary() {
  const total = summary.records.length, correct = summary.records.filter(r => r.correct).length, missed = summary.records.filter(r => !r.correct);
  main.innerHTML = `<section class="summary-card"><div class="celebration">${icon('trophy')}</div><div class="eyebrow subtle">${t('LESSON COMPLETE')}</div><h1>${t(correct === total ? 'Perfect practice!' : 'One step stronger!')}</h1><p>${t(correct === total ? 'Every word, every time. Well done!' : 'Every try counts. Keep learning.')}</p><div class="summary-stats"><div class="summary-stat"><strong>${correct * 10}</strong><span>${t('XP earned')}</span></div><div class="summary-stat"><strong><bdi>${correct}/${total}</bdi></strong><span>${t('correct answers')}</span></div><div class="summary-stat"><strong>${Math.round(correct / total * 100)}%</strong><span>${t('accuracy')}</span></div></div>${missed.length ? `<div class="review-list"><h2>${t('Words to try again')}</h2>${missed.map(r => `<div class="review-row"><span lang="en" dir="ltr">${escape(r.en)}</span><span lang="he" dir="rtl">${escape(words.find(w => w.id === r.wordId)?.he || r.he)}</span></div>`).join('')}</div>` : `<div class="notice">${t('Come back tomorrow to help these words stick.')}</div>`}<div class="summary-actions"><button class="primary-button" data-action="${missed.length ? 'retry-missed' : 'start'}">${t(missed.length ? 'Try those words again' : 'Another lesson')}</button><button class="secondary-button" data-action="home">${t('Back to learning')}</button></div></section>`;
}
function renderWords() {
  main.innerHTML = `${noticeMarkup()}<div class="page-heading"><h1>${t('Your word collection')}</h1><p>${t('Listen, explore, and find the words that need another try.')}</p></div><div class="toolbar"><label class="search-box" for="word-search">${icon('search')}<input type="search" id="word-search" value="${escape(wordQuery)}" placeholder="${t('Find a word in English or Hebrew')}" aria-label="${t('Search English and Hebrew words')}" autocomplete="off"></label><select data-change="word-pack" aria-label="${t('Word set')}">${packOptions(state.settings.pack)}</select><select data-change="sort" aria-label="${t('Sort words')}">${[['practice', 'Needs practice first'], ['alpha', 'English A–Z'], ['accuracy', 'Lowest accuracy first'], ['recent', 'Recently practised']].map(([key, label]) => `<option value="${key}" ${wordSort === key ? 'selected' : ''}>${t(label)}</option>`).join('')}</select></div><div class="word-filters" role="group" aria-label="${t('Filter learning status')}">${[['all', 'All words'], ...Object.entries(statusNames)].map(([key, label]) => `<button class="filter-button ${wordFilter === key ? 'active' : ''}" data-filter="${key}" aria-pressed="${wordFilter === key}">${t(label)}</button>`).join('')}</div><div id="word-results"></div>`;
  renderWordTable();
}
function renderWordTable() {
  const query = wordQuery.trim().toLocaleLowerCase();
  let list = currentPool().filter(w => (!query || w.en.toLocaleLowerCase().includes(query) || w.translations.some(t => t.includes(query))) && (wordFilter === 'all' || wordStatus(stats.get(w.id)) === wordFilter));
  const rank = { review: 0, learning: 1, new: 2, confident: 3 };
  list.sort((a, b) => {
    const sa = stats.get(a.id), sb = stats.get(b.id);
    if (wordSort === 'practice') return rank[wordStatus(sa)] - rank[wordStatus(sb)] || a.en.localeCompare(b.en);
    if (wordSort === 'accuracy') return (sa ? sa.correct / sa.attempts : 2) - (sb ? sb.correct / sb.attempts : 2) || a.en.localeCompare(b.en);
    if (wordSort === 'recent') return (Date.parse(sb?.last) || 0) - (Date.parse(sa?.last) || 0) || a.en.localeCompare(b.en);
    return a.en.localeCompare(b.en);
  });
  const pageSize = 20, pages = Math.max(1, Math.ceil(list.length / pageSize)); wordPage = Math.min(wordPage, pages - 1);
  const slice = list.slice(wordPage * pageSize, (wordPage + 1) * pageSize);
  $('#word-results').innerHTML = !list.length ? `<div class="empty-state"><div class="card-icon">${icon('search')}</div><h2>${t('No words here yet.')}</h2><p>${t(wordQuery ? 'Try a different spelling or a wider filter.' : 'Try another filter, or take a lesson to grow your collection.')}</p><button class="text-button" data-action="clear-filters">${t('Clear filters')}</button></div>` : `<div class="table-wrap"><table class="word-table"><caption class="sr-only">${t('Your vocabulary and practice results. Confident means three consecutive correct answers.')}</caption><thead><tr>${['English', 'Hebrew', 'Progress', 'Accuracy'].map(label => `<th scope="col">${t(label)}</th>`).join('')}</tr></thead><tbody>${slice.map(w => { const stat = stats.get(w.id), status = wordStatus(stat); return `<tr><td><div class="word-and-sound"><button class="icon-button" data-speak="${escape(w.id)}" aria-label="${escape(t('Hear {word}', { word: w.en }))}">${icon('sound')}</button><span lang="en" dir="ltr">${escape(w.en)}</span></div></td><td lang="he" dir="rtl">${escape(w.translations.join(' / '))}</td><td><span class="badge ${status}">${statusName(status)}</span></td><td>${stat ? `<bdi>${Math.round(stat.correct / stat.attempts * 100)}% <span class="review-accuracy">(${stat.correct}/${stat.attempts})</span></bdi>` : '<span class="subtle">—</span>'}</td></tr>`; }).join('')}</tbody></table></div><div class="table-footer"><span>${t('{first}–{last} of {count} words', { first: wordPage * pageSize + 1, last: Math.min((wordPage + 1) * pageSize, list.length), count: list.length.toLocaleString(locale(state.settings.language)) })}</span><div class="pagination"><button class="icon-button" data-action="prev-page" aria-label="${t('Previous page')}" ${wordPage ? '' : 'disabled'}>${icon('back')}</button><bdi>${wordPage + 1} / ${pages}</bdi><button class="icon-button" data-action="next-page" aria-label="${t('Next page')}" ${wordPage + 1 >= pages ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
}
function renderProgress() {
  const total = state.answers.length, correct = state.answers.filter(a => a.correct).length;
  const counts = { learning: 0, confident: 0, review: 0 };
  for (const w of words) { const status = wordStatus(stats.get(w.id)); if (status !== 'new') counts[status]++; }
  const practiced = counts.learning + counts.confident + counts.review;
  const week = weekActivity(state.answers).map(d => ({ ...d, label: dayLabel(d.day, state.settings.language) })), peak = Math.max(1, ...week.map(d => d.count));
  const statCards = [['Words practised', practiced, t('Distinct English words'), 'book'], ['Accuracy', total ? `${Math.round(correct / total * 100)}%` : '—', t('{correct} correct of {total} answers', { correct, total }), 'target'], ['Current streak', streakDays(state.answers), t('Days with a little practice'), 'fire'], ['Total XP', correct * 10, t('10 XP for each correct answer'), 'star']];
  main.innerHTML = `${noticeMarkup()}<div class="page-heading"><h1>${t('Your progress')}</h1><p>${t('Every exercise moves you forward.')}</p></div><div class="stats-grid">${statCards.map(([label, value, foot, symbol]) => `<section class="stat-card"><div class="stat-top"><span>${t(label)}</span>${icon(symbol)}</div><div class="big-number"><bdi>${typeof value === 'number' ? value.toLocaleString(locale(state.settings.language)) : value}</bdi></div><p class="stat-foot">${foot}</p></section>`).join('')}</div>
    ${!total ? `<div class="empty-state"><h2>${t('Your story starts with one word.')}</h2><p>${t('Finish a few questions and watch your progress take shape.')}</p><button class="primary-button" data-action="start">${t('Start my first lesson')}</button></div>` : ''}
    <div class="progress-grid"><section class="panel"><h2>${t('Your week in words')}</h2><p>${t('Exercises over the last seven days')}</p><div class="week-chart" role="img" aria-label="${escape(week.map(d => t('{day}: {count} exercises', { day: d.label, count: d.count })).join(', '))}">${week.map((d, i) => `<div class="day-bar ${i === 6 ? 'today' : ''}" aria-hidden="true"><div class="bar-space"><span class="bar-count">${d.count || ''}</span><span class="bar" style="height:${Math.max(4, d.count / peak * 95)}px"></span></div><span class="bar-label">${d.label}</span></div>`).join('')}</div></section><section class="panel"><h2>${t('Words finding their place')}</h2><p>${t('“Confident” means 3 correct answers in a row.')}</p><div class="learning-breakdown" aria-hidden="true">${[['confident', '#58cc02'], ['learning', '#49c0f8'], ['review', '#ffc800']].map(([k, color]) => `<span style="width:${practiced ? counts[k] / practiced * 100 : 0}%;background:${color}"></span>`).join('')}</div>${[['confident', '#58cc02'], ['learning', '#49c0f8'], ['review', '#ffc800']].map(([k, color]) => `<div class="breakdown-row"><span class="breakdown-label"><i class="legend-square" style="background:${color}" aria-hidden="true"></i>${statusName(k)}</span><strong>${counts[k]}</strong></div>`).join('')}<p class="progress-badge">${t('{count} lessons completed', { count: state.sessions.length })}</p></section></div>
    <section class="data-panel"><div><h2>${t('Keep your progress')}</h2><p>${t('Progress stays in this browser on this device. Download a backup to move it, or import your original Emma English answer-history CSV.')}</p></div><div class="data-actions"><button class="secondary-button" data-action="export-csv" ${total ? '' : 'disabled'}>${icon('download')} CSV</button><button class="secondary-button" data-action="backup">${t('Backup')}</button><button class="secondary-button" data-action="import">${icon('upload')} ${t('Import')}</button></div></section><input id="import-file" type="file" accept=".csv,.json,text/csv,application/json" hidden>`;
}
function showSettings() {
  if (!ready) return;
  const s = state.settings, dialog = $('#settings-dialog');
  dialog.innerHTML = `<form id="settings-form"><div class="dialog-heading"><h2 id="settings-title">${t('Make it yours')}</h2><button class="icon-button" type="button" data-action="close-settings" aria-label="${t('Close settings')}">${icon('close')}</button></div><p class="dialog-subtitle">${t(session ? 'Lesson changes apply next time. Audio and language change now.' : 'Choose your pace. You can change this anytime.')}</p><div class="settings-grid"><label>${t('Interface language')}<select name="language"><option lang="en" value="en" ${s.language === 'en' ? 'selected' : ''}>English</option><option lang="he" value="he" ${s.language === 'he' ? 'selected' : ''}>עברית</option></select></label><label>${t('Word set')}<select name="pack">${packOptions(s.pack)}</select></label><label>${t('Questions per lesson')}<select name="questions">${[5, 10, 15, 20, 30].map(n => `<option ${n === s.questions ? 'selected' : ''} value="${n}">${t('{count} questions', { count: n })}</option>`).join('')}</select></label><label>${t('Answer choices')}<select name="choices"><option value="4" ${s.choices === 4 ? 'selected' : ''}>${t('4 · Focused')}</option><option value="7" ${s.choices === 7 ? 'selected' : ''}>${t('7 · Extra challenge')}</option></select></label><label>${t('Daily goal')}<select name="goal">${[5, 10, 15, 20, 30].map(n => `<option value="${n}" ${n === s.goal ? 'selected' : ''}>${t('{count} exercises per day', { count: n })}</option>`).join('')}</select></label><label>${t('Pronunciation speed')}<select name="rate">${[[0.7, 'Slow'], [0.85, 'Gentle'], [1, 'Natural']].map(([n, label]) => `<option value="${n}" ${n === s.rate ? 'selected' : ''}>${t(label)}</option>`).join('')}</select></label></div><label class="setting-toggle"><span><strong>${t('Answer sounds')}</strong><span>${t('Play a different sound for correct and incorrect answers.')}</span></span><input type="checkbox" role="switch" name="effects" ${s.effects ? 'checked' : ''}></label><label class="setting-toggle"><span><strong>${t('Read words aloud')}</strong><span>${t('Play English pronunciation automatically. You can always tap replay.')}</span></span><input type="checkbox" role="switch" name="sound" ${s.sound ? 'checked' : ''}></label><label class="setting-toggle"><span><strong>${t('A matching break')}</strong><span>${t('Match four pairs after five questions in longer lessons.')}</span></span><input type="checkbox" role="switch" name="bonus" ${s.bonus ? 'checked' : ''}></label><div class="settings-data"><p>${t('Pronunciation depends on the voices available on your device. Progress is saved in this browser.')}</p><button class="text-button" type="button" data-action="reset">${t('Reset this device’s progress')}</button></div><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-settings">${t('Cancel')}</button><button class="primary-button" type="submit">${t('Save settings')}</button></div></form>`;
  dialog.showModal();
}
function confirmAction(title, description, label, callback, dangerous = false) {
  const dialog = $('#confirm-dialog');
  confirmCallback = callback;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="confirm-title">${escape(t(title))}</h2></div><p class="dialog-subtitle" style="margin-top:14px">${escape(t(description))}</p><div class="dialog-actions"><button class="secondary-button" data-action="cancel-confirm" autofocus>${t('Keep going')}</button><button class="${dangerous ? 'danger-button' : 'primary-button'}" data-action="accept-confirm">${escape(t(label))}</button></div>`;
  dialog.showModal();
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function exportBackup() {
  if (persistenceBlocked) {
    let previousRaw = null;
    try { previousRaw = localStorage.getItem(STORAGE_KEY); } catch { /* Keep this tab's progress exportable even when storage reads are blocked. */ }
    download(JSON.stringify({ ...state, exportedAt: new Date().toISOString(), recovery: { previousRaw } }, null, 2), `emmaenglish2-recovery-${localDay()}.json`, 'application/json;charset=utf-8');
    toast('Recovery backup downloaded, including this tab’s progress.');
    return;
  }
  download(JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), `emmaenglish2-backup-${localDay()}.json`, 'application/json;charset=utf-8');
}
async function importFile(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Please choose a CSV or backup smaller than 8 MB.'); return; }
  try {
    const text = await file.text(); let incoming, importedSettings = null, importedSessions = [];
    if (file.name.toLowerCase().endsWith('.csv')) incoming = parseCSV(text);
    else {
      const data = JSON.parse(text);
      if (data.version !== 1 || !Array.isArray(data.answers)) throw new Error('Choose an Emma English 2 backup or an original answer-history CSV.');
      incoming = cleanAnswers(data.answers); importedSettings = normalizeSettings(data.settings); importedSessions = cleanSessions(data.sessions);
    }
    if (!incoming.length && !importedSettings) throw new Error('No valid practice answers were found in that file.');
    // Original CSVs store the selected answer in “hebrew”; preserve it as chosen and restore the dictionary meaning.
    incoming = incoming.map(a => ({ ...a, he: words.find(w => w.id === a.wordId)?.he || a.he }));
    const apply = () => {
      const before = state.answers.length; state.answers = mergeAnswers(state.answers, incoming);
      if (importedSettings) state.settings = importedSettings;
      if (!forPack(words, state.settings.pack).length) state.settings.pack = words[0].packs[0];
      state.sessions = [...new Map([...state.sessions, ...importedSessions].map(s => [s.id, s])).values()];
      persistenceBlocked = false; refreshStats(); persist(); view = 'progress'; render(true);
      toast(t('Imported {count} answers. Duplicate answers were skipped.', { count: state.answers.length - before }));
    };
    if (persistenceBlocked) confirmAction('Replace unreadable saved data?', 'Download the recovery backup first if you want to keep it. Importing will replace that unreadable copy.', 'Import and replace', apply, true);
    else apply();
  } catch (error) { const message = error.message || ''; toast(message && (state.settings.language === 'en' || t(message) !== message) ? message : 'That file could not be imported. Your progress has not changed.'); }
}
const actions = {
  'toggle-language': () => { state.settings.language = state.settings.language === 'en' ? 'he' : 'en'; persist(); render(); },
  'toggle-effects': () => { state.settings.effects = !state.settings.effects; if (!state.settings.effects) answerSounds.stop(); persist(); header(); },
  start: () => startLesson(), listen: () => startLesson('listen'), reverse: () => startLesson('reverse'), review: () => startLesson('translate', true),
  match: () => startMatch(), home: () => navigate('learn'), words: () => navigate('words'), leave: () => navigate('learn'),
  replay: () => { if (session) speak(session.mode === 'reverse' ? session.current.word.he : session.current.word.en, session.mode === 'reverse' ? 'he-IL' : 'en-US', true); },
  slow: () => { if (session) speak(session.current.word.en, 'en-US', true, true); },
  reveal: () => { if (session) { session.current.revealed = true; renderLesson(); } },
  skip: () => answer(null), next: nextQuestion, 'match-done': finishMatch, 'skip-match': finishMatch,
  'retry-missed': () => { const retry = summary.records.filter(r => !r.correct).map(r => words.find(w => w.id === r.wordId)).filter(Boolean); startLesson(summary.mode, false, retry); },
  'prev-page': () => { wordPage = Math.max(0, wordPage - 1); renderWordTable(); },
  'next-page': () => { wordPage++; renderWordTable(); },
  'clear-filters': () => { wordQuery = ''; wordFilter = 'all'; wordPage = 0; renderWords(); },
  settings: showSettings, 'close-settings': () => $('#settings-dialog').close(),
  'cancel-confirm': () => { confirmCallback = null; $('#confirm-dialog').close(); },
  'accept-confirm': () => { const callback = confirmCallback; confirmCallback = null; $('#confirm-dialog').close(); callback?.(); },
  'export-csv': () => { if (state.answers.length) download(toCSV(state.answers), `quiz_answers_${localDay()}.csv`, 'text/csv;charset=utf-8'); },
  backup: exportBackup, import: () => $('#import-file').click(),
  reset: () => {
    $('#settings-dialog').close();
    confirmAction('Start fresh on this device?', 'This deletes your saved answers, lesson history, and streak here. Download a backup from My progress first if you want to keep them.', 'Reset progress', () => {
      cancelSpeech(); const settings = state.settings; state = createState(); state.settings = settings; persistenceBlocked = false; session = null; match = null; summary = null; refreshStats(); persist(); view = 'learn'; render(true); toast('A fresh start. Your practice settings were kept.');
    }, true);
  },
  reload: () => location.reload(),
};
document.addEventListener('click', event => {
  const nav = event.target.closest('[data-page]');
  if (nav && ready) { event.preventDefault(); navigate(nav.dataset.page); return; }
  const button = event.target.closest('button'); if (!button || button.disabled || !ready) return;
  if (button.dataset.action) { actions[button.dataset.action]?.(); return; }
  if ('choice' in button.dataset) { answer(Number(button.dataset.choice)); return; }
  if (button.dataset.pair) { choosePair(button); return; }
  if (button.dataset.speak) { const w = words.find(x => x.id === button.dataset.speak); if (w) speak(w.en, 'en-US', true); return; }
  if (button.dataset.filter) { wordFilter = button.dataset.filter; wordPage = 0; renderWords(); }
});
document.addEventListener('input', event => { if (event.target.id === 'word-search') { wordQuery = event.target.value; wordPage = 0; renderWordTable(); } });
document.addEventListener('change', event => {
  const el = event.target;
  if (el.id === 'import-file') { importFile(el.files[0]); el.value = ''; return; }
  if (['pack', 'word-pack'].includes(el.dataset.change)) { state.settings.pack = el.value; wordPage = 0; persist(); render(); }
  if (el.dataset.change === 'sort') { wordSort = el.value; wordPage = 0; renderWordTable(); }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'settings-form') return;
  event.preventDefault(); const data = new FormData(event.target);
  state.settings = normalizeSettings({ ...Object.fromEntries(data), goalVersion: 2, effects: data.has('effects'), sound: data.has('sound'), bonus: data.has('bonus') });
  if (!state.settings.effects) answerSounds.stop(); if (!state.settings.sound) cancelSpeech(); const saved = persist(); $('#settings-dialog').close(); render(); toast(saved ? 'Your practice settings are saved.' : 'Settings updated in this tab. Download a backup to keep them.');
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (view === 'lesson' && session && /^[1-7]$/.test(event.key) && !session.current.answered) { event.preventDefault(); answer(Number(event.key) - 1); }
  if (view === 'lesson' && session?.current.answered && event.key === 'Enter' && document.activeElement?.id !== 'continue-button' && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); nextQuestion(); }
});
window.addEventListener('hashchange', () => { if (ready) navigate(location.hash.slice(1)); });
window.addEventListener('pagehide', () => { cancelSpeech(); answerSounds.stop(); });
// Avoid silent cross-tab overwrites of saved learning history.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue || persistenceBlocked) return;
  try {
    const incoming = JSON.parse(event.newValue); if (incoming.version !== 1) return;
    state.answers = mergeAnswers(state.answers, cleanAnswers(incoming.answers));
    state.sessions = [...new Map([...state.sessions, ...cleanSessions(incoming.sessions)].map(s => [s.id, s])).values()];
    refreshStats(); if (!session && view !== 'match' && !document.querySelector('dialog[open]')) render();
  } catch { /* Another tab's invalid data cannot replace the valid in-memory state. */ }
});

async function init() {
  loadState(); refreshStats(); icons(); header();
  const results = await Promise.allSettled(['dictionary.json', 'StrangerThings.json'].map(async name => {
    const response = await fetch(new URL(`./data/${name}`, import.meta.url));
    if (!response.ok) throw new Error(`Vocabulary request failed: ${response.status}`);
    const list = await response.json(); if (!Array.isArray(list)) throw new Error('Invalid vocabulary format'); return list;
  }));
  const base = results[0].status === 'fulfilled' ? results[0].value : [];
  const stories = results[1].status === 'fulfilled' ? results[1].value : [];
  words = normalizeDictionary(base, stories);
  if (!words.length) {
    main.innerHTML = `<div class="empty-state"><div class="card-icon">${icon('book')}</div><h1>${t('Your words couldn’t load.')}</h1><p>${t('Check your connection and try again. Your saved progress is still here.')}</p><button class="primary-button" id="retry-load">${t('Try again')}</button></div>`;
    $('#retry-load').onclick = () => location.reload(); return;
  }
  if (!base.length || !stories.length) loadWarning = { pack: !base.length ? 'everyday' : 'stories' };
  if (!forPack(words, state.settings.pack).length) state.settings.pack = base.length ? 'everyday' : 'stories';
  ready = true; view = ['words', 'progress'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'learn'; render();
}
init();
