import { STORAGE_KEY, DEFAULT_SETTINGS, createState, normalizeSettings, normalizeDictionary, forPack, shuffled, summarizeWords, wordStatus, selectLesson, buildChoices, selectPairs, answerRecord, cleanAnswers, mergeAnswers, parseCSV, toCSV, streakDays, weekActivity, localDay, wordId } from './core.js';

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
  return Array.isArray(list) ? list.filter(s => s && typeof s.id === 'string' && s.id.length < 100 && Number.isFinite(Date.parse(s.completedAt)) && Number.isInteger(s.total) && s.total > 0 && s.total <= 20 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.total)
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
  clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.hidden = false;
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
    p.style.background = ['#6752e8', '#f9c653', '#39a88b', '#a997fa'][i % 4]; p.style.animationDelay = `${Math.random() * 0.35}s`; el.append(p);
  }
  document.body.append(el); setTimeout(() => el.remove(), 2100);
}
function packOptions(value) { return Object.entries(packNames).filter(([key]) => forPack(words, key).length).map(([key, name]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${name}</option>`).join(''); }
function noticeMarkup() {
  return [storageWarning, loadWarning].filter(Boolean).map(t => `<div class="notice">${icon('info')}<span>${escape(t)}</span></div>`).join('');
}
function header() {
  const streak = streakDays(state.answers);
  $('#streak-pill').innerHTML = `${icon('fire')}<span>${streak ? `${streak} day${streak === 1 ? '' : 's'}` : 'A fresh start'}</span>`;
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
  const confident = [...stats.values()].filter(s => wordStatus(s) === 'confident').length;
  main.innerHTML = `${noticeMarkup()}
    <div class="page-heading"><div><h1>${state.answers.length ? 'Ready for your next little win?' : 'Hello, curious mind.'}</h1><p>Make a little room for English today.</p></div><div class="pack-control"><label for="home-pack">Your word set</label><select id="home-pack" data-change="pack">${packOptions(state.settings.pack)}</select></div></div>
    <div class="hero-grid">
      <section class="lesson-start" aria-labelledby="daily-title"><div class="hero-label">${icon('star')} YOUR DAILY PRACTICE</div><h2 id="daily-title">${today >= goal ? 'Keep the good\nwords coming.' : 'Small lesson.\nBig little win.'}</h2><p>${count} questions <span aria-hidden="true">·</span> ${packNames[state.settings.pack]}</p><button class="primary-button yellow" data-action="start">${state.answers.length ? 'Start my lesson' : 'Let’s do this'} ${icon('arrow')}</button><div class="hero-letters" aria-hidden="true">Aa<span>אבג</span></div></section>
      <section class="goal-card" aria-label="Daily practice goal"><div class="goal-label">Today's goal ${icon('target')}</div><div class="goal-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="51"/><circle class="ring-fill" cx="60" cy="60" r="51" stroke-dasharray="320.44" stroke-dashoffset="${320.44 * (1 - percent)}"/></svg><div class="goal-value">${today}<small> / ${goal}</small></div></div><p>questions practised today</p><div class="goal-note">${today >= goal ? 'Daily goal complete. Nice work!' : today ? `${goal - today} more to reach your goal` : 'One little lesson is all it takes.'}</div></section>
    </div>
    <div class="section-title"><h2>A different way to practise</h2><span class="subtle">Find your rhythm</span></div>
    <div class="practice-grid">
      <button class="practice-card" data-action="listen" ${canSpeak ? '' : 'disabled'}><span class="card-icon">${icon('headphones')}</span><span><span class="practice-title">Listen & learn</span><span class="practice-description">${canSpeak ? 'Hear it. Know it.' : 'Audio unavailable here'}</span></span><span class="practice-arrow">${icon('chevron')}</span></button>
      <button class="practice-card" data-action="reverse"><span class="card-icon teal">${icon('swap')}</span><span><span class="practice-title">Flip the words</span><span class="practice-description">Hebrew to English</span></span><span class="practice-arrow">${icon('chevron')}</span></button>
      <button class="practice-card" data-action="match"><span class="card-icon amber">${icon('match')}</span><span><span class="practice-title">Make a match</span><span class="practice-description">Find the word pairs</span></span><span class="practice-arrow">${icon('chevron')}</span></button>
    </div>
    <div class="home-bottom"><section class="review-card"><div><h3>${due ? `${due} word${due === 1 ? '' : 's'} ready for another try` : state.answers.length ? 'Your words are finding their place.' : 'Every word starts somewhere.'}</h3><p>${due ? 'A quick revisit helps them stick.' : confident ? `${confident} words answered correctly 3 times in a row.` : state.answers.length ? 'Come back tomorrow for a little review.' : 'Your first lesson will get things going.'}</p></div><button class="text-button" data-action="${due ? 'review' : 'words'}">${due ? 'Practise' : 'My words'} ${icon('arrow')}</button></section>
      <section class="word-spotlight" aria-label="Word spotlight"><div><div class="eyebrow">A WORD TO KEEP</div><strong>${escape(featured.en)} <span lang="he" dir="rtl">${escape(featured.he)}</span></strong></div><button class="icon-button" data-speak="${escape(featured.id)}" aria-label="Hear ${escape(featured.en)}">${icon('sound')}</button></section></div>`;
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
  return `<div class="lesson-top"><button class="icon-button" data-action="leave" aria-label="Leave practice">${icon('close')}</button><div class="lesson-progress-wrap"><div class="lesson-progress-label"><span>${label}</span><span>${Math.round(progress)}%</span></div><div class="progress-track" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div></div><div class="lesson-score">${icon('star')} ${score} XP</div></div>`;
}
function renderLesson() {
  const { current: q, index, queue, mode, records } = session;
  const { word, answered, correct, options, chosen } = q, reverse = mode === 'reverse', listening = mode === 'listen';
  const target = reverse ? word.en : word.he;
  const prompt = reverse ? word.he : word.en;
  main.innerHTML = `<div class="lesson-shell">${lessonTop(`Question ${index + 1} of ${queue.length}`, records.length / queue.length * 100, records.filter(a => a.correct).length * 10)}
    <section class="question-card" aria-labelledby="question-instruction"><span class="question-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h1 class="eyebrow" id="question-instruction">${listening ? 'Listen. What does the word mean?' : reverse ? 'Choose the English meaning' : 'Choose the Hebrew meaning'}</h1>
      ${listening && !q.revealed && !answered ? `<div class="prompt-row"><button class="listen-button" data-action="replay" aria-label="Play the English word">${icon('sound')}</button></div><div class="listen-label"><button class="text-button" data-action="slow">Play slowly</button> <span aria-hidden="true">·</span> <button class="text-button" data-action="reveal">Show word</button></div>` : `<div class="prompt-row"><div class="prompt-word" lang="${reverse ? 'he' : 'en'}" dir="${reverse ? 'rtl' : 'ltr'}">${escape(prompt)}</div><button class="icon-button" data-action="replay" aria-label="Hear ${escape(prompt)}">${icon('sound')}</button></div>`}
      <div class="choices" role="group" aria-label="Answer choices">${options.map((option, i) => {
        const isCorrect = option === target;
        const style = answered ? isCorrect ? 'correct' : chosen === option ? 'wrong' : 'faded' : '';
        return `<button class="choice ${style}" lang="${reverse ? 'en' : 'he'}" data-choice="${i}" ${answered ? 'disabled' : ''}><span class="choice-key" aria-hidden="true">${i + 1}</span><span class="choice-label" dir="${reverse ? 'ltr' : 'rtl'}">${escape(option)}</span>${answered && (isCorrect || chosen === option) ? icon(isCorrect ? 'check' : 'close') : ''}</button>`;
      }).join('')}</div>
      <p class="quiz-helper">${icon('info')} ${answered ? 'Take a moment to remember this one.' : 'Choose one answer. Take your time.'}</p>
    </section>
    <div class="lesson-bottom">${answered ? `<div class="feedback ${correct ? '' : 'incorrect'}" role="status"><span class="feedback-icon">${icon(correct ? 'check' : 'book')}</span><div><strong>${correct ? ['You’ve got it!', 'That’s the one!', 'Nicely done!'][index % 3] : 'A new word to remember.'}</strong><p><span lang="en">${escape(word.en)}</span> <span aria-hidden="true">=</span> <span lang="he" dir="rtl">${escape(word.translations.join(' / '))}</span></p></div></div><button id="continue-button" class="primary-button" data-action="next">${index + 1 === queue.length ? 'See my results' : 'Continue'} ${icon('arrow')}</button>` : `<button class="text-button" data-action="skip">I don’t know yet</button><span class="subtle" style="font-size:.8rem">${listening ? 'Tap the speaker to listen again' : `Keyboard: ${options.map((_, i) => i + 1).join('–')}`}</span>`}</div></div>`;
}
function answer(index) {
  if (view !== 'lesson' || !session || session.current.answered) return;
  const q = session.current, chosen = index === null ? '' : q.options[index];
  if (typeof chosen !== 'string') return;
  // Lock before any side effect so double taps and key repeats cannot score twice.
  q.answered = true; q.chosen = chosen; q.correct = chosen === (session.mode === 'reverse' ? q.word.en : q.word.he);
  const record = answerRecord(q.word, chosen, q.correct, session.mode, performance.now() - q.start);
  session.records.push(record); state.answers.push(record); refreshStats(); persist(); cancelSpeech();
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
  const column = (items, side) => `<div class="match-column"><div class="match-column-title" ${side === 'he' ? 'lang="he" dir="rtl"' : ''}>${side === 'en' ? 'ENGLISH' : 'עברית'}</div>${items.map(w => {
    const key = `${side}:${w.id}`;
    const classes = [m.matched.has(w.id) ? 'matched' : '', m.selected?.key === key ? 'selected' : '', m.wrong === key ? 'mismatch' : ''].join(' ');
    return `<button class="pair-button ${classes}" data-pair="${escape(key)}" data-side="${side}" data-word="${escape(w.id)}" lang="${side}" dir="${side === 'he' ? 'rtl' : 'ltr'}" aria-pressed="${m.selected?.key === key}" ${m.matched.has(w.id) ? 'disabled' : ''}>${escape(w[side])}${m.matched.has(w.id) ? ' ✓' : ''}</button>`;
  }).join('')}</div>`;
  main.innerHTML = `<div class="lesson-shell">${lessonTop(m.bonus ? 'A little word break' : 'Make a match', m.matched.size / m.pairs.length * 100, m.bonus ? session.records.filter(r => r.correct).length * 10 : 0)}<section class="question-card"><span class="break-label">${m.bonus ? 'HALFWAY THERE' : 'WORD PLAY'}</span><h1 style="font-size:1.9rem">Better together.</h1><p class="subtle" style="margin-top:8px;font-size:.9rem">Match each English word to its Hebrew meaning.</p><div class="match-grid">${column(m.left, 'en')}${column(m.right, 'he')}</div><div class="match-status" role="status">${escape(m.status)}</div></section><div class="lesson-bottom"><span class="subtle" style="font-size:.85rem">${m.matched.size} of ${m.pairs.length} pairs found${m.moves ? ` · ${m.moves} tries` : ''}</span>${m.complete ? `<button class="primary-button" data-action="match-done">${m.bonus ? 'Back to my lesson' : 'Play again'} ${icon('arrow')}</button>` : m.bonus ? '<button class="text-button" data-action="skip-match">Skip this break</button>' : '<button class="text-button" data-action="home">Back to learning</button>'}</div></div>`;
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
    match.moves++;
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
  main.innerHTML = `<section class="summary-card"><div class="celebration">${icon('trophy')}</div><div class="eyebrow subtle" style="margin-bottom:10px">LESSON COMPLETE</div><h1>${correct === total ? 'Look at you go!' : 'A little better than before.'}</h1><p>${correct === total ? 'Every word, every time. That’s a lovely little win.' : 'Every try counts. You showed up and kept learning.'}</p><div class="summary-stats"><div class="summary-stat"><strong>${correct * 10}</strong><span>XP earned</span></div><div class="summary-stat"><strong>${correct}/${total}</strong><span>correct answers</span></div><div class="summary-stat"><strong>${Math.round(correct / total * 100)}%</strong><span>accuracy</span></div></div>${missed.length ? `<div class="review-list"><h3>A few words to take with you</h3>${missed.map(r => `<div class="review-row"><span>${escape(r.en)}</span><span lang="he" dir="rtl">${escape(words.find(w => w.id === r.wordId)?.he || r.he)}</span></div>`).join('')}</div>` : '<div class="notice" style="justify-content:center">Come back tomorrow to help these words stick.</div>'}<div class="summary-actions">${missed.length ? '<button class="primary-button" data-action="retry-missed">Try those words again</button>' : '<button class="primary-button" data-action="start">Another little lesson</button>'}<button class="secondary-button" data-action="home">Back to learning</button></div></section>`;
}
function renderWords() {
  main.innerHTML = `${noticeMarkup()}<div class="page-heading"><div><h1>Your growing word collection.</h1><p>Listen, explore, and find the words that need another try.</p></div></div><div class="toolbar"><label class="search-box" for="word-search">${icon('search')}<input type="search" id="word-search" value="${escape(wordQuery)}" placeholder="Find a word in English or Hebrew" aria-label="Search English and Hebrew words" autocomplete="off"></label><select data-change="word-pack" aria-label="Word set">${packOptions(state.settings.pack)}</select><select data-change="sort" aria-label="Sort words"><option value="practice" ${wordSort === 'practice' ? 'selected' : ''}>Needs practice first</option><option value="alpha" ${wordSort === 'alpha' ? 'selected' : ''}>English A–Z</option><option value="accuracy" ${wordSort === 'accuracy' ? 'selected' : ''}>Lowest accuracy first</option><option value="recent" ${wordSort === 'recent' ? 'selected' : ''}>Recently practised</option></select></div><div class="word-filters" role="group" aria-label="Filter learning status">${[['all', 'All words'], ...Object.entries(statusNames)].map(([key, label]) => `<button class="filter-button ${wordFilter === key ? 'active' : ''}" data-filter="${key}" aria-pressed="${wordFilter === key}">${label}</button>`).join('')}</div><div id="word-results"></div>`;
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
  $('#word-results').innerHTML = !list.length ? `<div class="empty-state"><div class="card-icon">${icon('search')}</div><h2>No words here yet.</h2><p>${wordQuery ? 'Try a different spelling or a wider filter.' : 'Try another filter, or take a lesson to get your collection growing.'}</p><button class="text-button" data-action="clear-filters">Clear filters</button></div>` : `<div class="table-wrap"><table class="word-table"><caption class="sr-only">Your vocabulary and practice results. Confident means three consecutive correct answers.</caption><thead><tr><th scope="col">ENGLISH</th><th scope="col">HEBREW</th><th scope="col">PROGRESS</th><th scope="col">ACCURACY</th></tr></thead><tbody>${slice.map(w => { const s = stats.get(w.id), status = wordStatus(s); return `<tr><td><div class="word-and-sound"><button class="icon-button" data-speak="${escape(w.id)}" aria-label="Hear ${escape(w.en)}">${icon('sound')}</button><span>${escape(w.en)}</span></div></td><td lang="he" dir="rtl">${escape(w.translations.join(' / '))}</td><td><span class="badge ${status}">${statusNames[status]}</span></td><td>${s ? `${Math.round(s.correct / s.attempts * 100)}% <span class="review-accuracy">(${s.correct}/${s.attempts})</span>` : '<span class="subtle">—</span>'}</td></tr>`; }).join('')}</tbody></table></div><div class="table-footer"><span>${wordPage * pageSize + 1}–${Math.min((wordPage + 1) * pageSize, list.length)} of ${list.length.toLocaleString()} words</span><div class="pagination"><button class="icon-button" data-action="prev-page" aria-label="Previous page" ${wordPage ? '' : 'disabled'}>${icon('back')}</button><span>${wordPage + 1} / ${pages}</span><button class="icon-button" data-action="next-page" aria-label="Next page" ${wordPage + 1 >= pages ? 'disabled' : ''}>${icon('chevron')}</button></div></div>`;
}
function renderProgress() {
  const total = state.answers.length, correct = state.answers.filter(a => a.correct).length;
  const counts = { learning: 0, confident: 0, review: 0 };
  for (const w of words) { const status = wordStatus(stats.get(w.id)); if (status !== 'new') counts[status]++; }
  const practiced = counts.learning + counts.confident + counts.review;
  const week = weekActivity(state.answers), peak = Math.max(1, ...week.map(d => d.count));
  const statCards = [['Words practised', practiced, 'Distinct English words', 'book'], ['Accuracy', total ? `${Math.round(correct / total * 100)}%` : '—', `${correct} correct of ${total} answers`, 'target'], ['Current streak', streakDays(state.answers), 'Days with a little practice', 'fire'], ['Total XP', correct * 10, '10 XP for each correct answer', 'star']];
  main.innerHTML = `${noticeMarkup()}<div class="page-heading"><div><h1>Look how far you’re growing.</h1><p>Your progress across all word sets. One little step at a time.</p></div></div><div class="stats-grid">${statCards.map(([label, value, foot, symbol]) => `<section class="stat-card"><div class="stat-top"><span>${label}</span>${icon(symbol)}</div><div class="big-number">${typeof value === 'number' ? value.toLocaleString() : value}</div><p class="stat-foot">${foot}</p></section>`).join('')}</div>
    ${!total ? '<div class="empty-state" style="margin-bottom:24px"><h2>Your story starts with one word.</h2><p>Finish a few questions and watch your progress take shape.</p><button class="primary-button" data-action="start">Start my first lesson</button></div>' : ''}
    <div class="progress-grid"><section class="panel"><h2>Your week in words</h2><p>Questions practised over the last seven days</p><div class="week-chart" role="img" aria-label="${escape(week.map(d => `${d.label}: ${d.count} questions`).join(', '))}">${week.map((d, i) => `<div class="day-bar ${i === 6 ? 'today' : ''}" aria-hidden="true"><div class="bar-space"><span class="bar-count">${d.count || ''}</span><span class="bar" style="height:${Math.max(4, d.count / peak * 95)}px"></span></div><span class="bar-label">${d.label}</span></div>`).join('')}</div></section><section class="panel"><h2>Words finding their place</h2><p>“Confident” means 3 correct answers in a row.</p><div class="learning-breakdown" aria-hidden="true">${[['confident', '#249573'], ['learning', '#8975ed'], ['review', '#e9b744']].map(([k, color]) => `<span style="width:${practiced ? counts[k] / practiced * 100 : 0}%;background:${color}"></span>`).join('')}</div>${[['confident', '#249573'], ['learning', '#8975ed'], ['review', '#e9b744']].map(([k, color]) => `<div class="breakdown-row"><span class="breakdown-label"><i class="legend-square" style="background:${color}" aria-hidden="true"></i>${statusNames[k]}</span><strong>${counts[k]}</strong></div>`).join('')}<p class="progress-badge">${state.sessions.length} lesson${state.sessions.length === 1 ? '' : 's'} completed</p></section></div>
    <section class="data-panel"><div><h3>Keep your progress close.</h3><p>Progress stays in this browser on this device. Download a backup to move it, or import your original Emma English answer-history CSV.</p></div><div class="data-actions"><button class="secondary-button" data-action="export-csv" ${total ? '' : 'disabled'}>${icon('download')} CSV</button><button class="secondary-button" data-action="backup">Backup</button><button class="secondary-button" data-action="import">${icon('upload')} Import</button></div></section><input id="import-file" type="file" accept=".csv,.json,text/csv,application/json" hidden>`;
}
function showSettings() {
  if (!ready) return;
  const s = state.settings, dialog = $('#settings-dialog');
  dialog.innerHTML = `<form id="settings-form"><div class="dialog-heading"><h2 id="settings-title">Make it yours.</h2><button class="icon-button" type="button" data-action="close-settings" aria-label="Close settings">${icon('close')}</button></div><p class="dialog-subtitle">Choose a comfortable pace. ${session ? 'Lesson changes apply next time. Audio changes apply now.' : 'You can change this anytime.'}</p><div class="settings-grid"><label>Word set<select name="pack">${packOptions(s.pack)}</select></label><label>Questions per lesson<select name="questions">${[5, 10, 15, 20].map(n => `<option ${n === s.questions ? 'selected' : ''} value="${n}">${n} questions</option>`).join('')}</select></label><label>Answer choices<select name="choices"><option value="4" ${s.choices === 4 ? 'selected' : ''}>4 · Focused</option><option value="7" ${s.choices === 7 ? 'selected' : ''}>7 · Extra challenge</option></select></label><label>Daily goal<select name="goal">${[5, 10, 15, 20].map(n => `<option value="${n}" ${n === s.goal ? 'selected' : ''}>${n} questions</option>`).join('')}</select></label><label>Pronunciation speed<select name="rate">${[[0.7, 'Slow'], [0.85, 'Gentle'], [1, 'Natural']].map(([n, label]) => `<option value="${n}" ${n === s.rate ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label class="setting-toggle"><span><strong>Read words aloud</strong><span>Play English pronunciation automatically. You can always tap replay.</span></span><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}></label><label class="setting-toggle"><span><strong>A little matching break</strong><span>Match four pairs after five questions in longer lessons.</span></span><input type="checkbox" name="bonus" ${s.bonus ? 'checked' : ''}></label><div class="settings-data"><p>Pronunciation depends on the voices available on your device. Progress is saved in this browser.</p><button class="text-button" type="button" data-action="reset">Reset this device’s progress</button></div><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-settings">Cancel</button><button class="primary-button" type="submit">Save settings</button></div></form>`;
  dialog.showModal();
}
function confirmAction(title, description, label, callback, dangerous = false) {
  const dialog = $('#confirm-dialog');
  confirmCallback = callback;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="confirm-title">${escape(title)}</h2></div><p class="dialog-subtitle" style="margin-top:14px">${escape(description)}</p><div class="dialog-actions"><button class="secondary-button" data-action="cancel-confirm" autofocus>Keep going</button><button class="${dangerous ? 'danger-button' : 'primary-button'}" data-action="accept-confirm">${escape(label)}</button></div>`;
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
      toast(`Imported ${state.answers.length - before} answers. Duplicate answers were skipped.`);
    };
    if (persistenceBlocked) confirmAction('Replace unreadable saved data?', 'Download the recovery backup first if you want to keep it. Importing will replace that unreadable copy.', 'Import and replace', apply, true);
    else apply();
  } catch (error) { toast(error.message || 'That file could not be imported. Your progress has not changed.'); }
}
const actions = {
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
  state.settings = normalizeSettings({ ...Object.fromEntries(data), sound: data.has('sound'), bonus: data.has('bonus') });
  if (!state.settings.sound) cancelSpeech(); const saved = persist(); $('#settings-dialog').close(); render(); toast(saved ? 'Your practice settings are saved.' : 'Settings updated in this tab. Download a backup to keep them.');
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (view === 'lesson' && session && /^[1-7]$/.test(event.key) && !session.current.answered) { event.preventDefault(); answer(Number(event.key) - 1); }
  if (view === 'lesson' && session?.current.answered && event.key === 'Enter' && document.activeElement?.id !== 'continue-button' && document.activeElement?.tagName !== 'BUTTON') { event.preventDefault(); nextQuestion(); }
});
window.addEventListener('hashchange', () => { if (ready) navigate(location.hash.slice(1)); });
window.addEventListener('pagehide', cancelSpeech);
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
    main.innerHTML = `<div class="empty-state"><div class="card-icon">${icon('book')}</div><h1>Your words couldn’t load.</h1><p>Check your connection and try again. Your saved progress is still here.</p><button class="primary-button" id="retry-load">Try again</button></div>`;
    $('#retry-load').onclick = () => location.reload(); return;
  }
  if (!base.length || !stories.length) loadWarning = `The ${!base.length ? 'Everyday' : 'Story'} words list could not load. You can still practise the available words. Refresh to try again.`;
  if (!forPack(words, state.settings.pack).length) state.settings.pack = base.length ? 'everyday' : 'stories';
  ready = true; view = ['words', 'progress'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'learn'; render();
}
init();
