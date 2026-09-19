import { PICTURE_WORDS, PICTURE_CATEGORIES, PICTURE_ATLASES, PICTURE_MODES, PICTURE_GOALS, createPictureStore, picturePool, pictureLesson, pictureChoices, pictureTotals } from './picture-core.js?v=2.7.0';
import { summarizeWords, wordStatus } from './core.js?v=2.5.0';
import { createAnswerSounds } from './sounds.js?v=2.2.1';

const $ = selector => document.querySelector(selector);
const main = $('#picture-main');
const store = createPictureStore({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
const sounds = createAnswerSounds();
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let page = 'home', session = null, picturesReady = false, pictureError = false, audioMessage = '';
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const wordById = id => PICTURE_WORDS.find(w => w.id === id);
function sprite(word, label = word.en) {
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
  const sound = $('#picture-sound');
  sound.textContent = store.state.settings.effects ? 'Sounds on' : 'Sounds off';
  sound.setAttribute('aria-pressed', String(store.state.settings.effects));
  document.querySelectorAll('.picture-nav button').forEach(button => {
    if (button.dataset.action === (page === 'words' ? 'words' : 'home')) button.setAttribute('aria-current', 'page');
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
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function categoryPicker() {
  return `<label>Word collection<select data-setting="category">${options(PICTURE_CATEGORIES, store.state.settings.category)}</select></label>`;
}
function renderHome() {
  const state = store.state, totals = pictureTotals(state), goal = state.settings.goal;
  const preview = state.settings.category === 'all' ? [wordById('cat'), wordById('apple'), wordById('sun'), wordById('teddy-bear')] : picturePool(state.settings.category).slice(0, 4);
  main.innerHTML = `<div class="picture-heading"><div><h1>Learn English with pictures</h1><p>Look, listen, and choose.</p></div></div>
    <section class="picture-start"><div><div class="eyebrow">YOUR NEXT 10 WORDS</div><h2>A little practice, every day.</h2><p>Match everyday words to their pictures.</p>
      <div class="picture-controls">${categoryPicker()}<label>Practice type<select data-setting="mode">${options(canSpeak ? PICTURE_MODES : { mixed: PICTURE_MODES.mixed, read: PICTURE_MODES.read }, canSpeak ? state.settings.mode : state.settings.mode === 'listen' ? 'read' : state.settings.mode)}</select></label></div>
      <button class="primary-button" data-action="start" ${picturesReady ? '' : 'disabled'}>${picturesReady ? 'Start picture practice' : pictureError ? 'Pictures unavailable' : 'Loading pictures…'}</button>
    </div><div class="picture-preview" aria-hidden="true">${preview.map(w => sprite(w)).join('')}</div></section>
    <section class="picture-goal"><div class="picture-goal-head"><div><h2>${totals.today >= goal ? 'Daily goal complete!' : 'Your daily goal'}</h2><p>${totals.today} / ${goal} exercises today</p></div><label>Daily exercises<select data-setting="goal">${PICTURE_GOALS.map(n => `<option value="${n}" ${goal === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="progress-track" role="progressbar" aria-label="Daily exercises" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(goal, totals.today)}"><span style="width:${Math.min(100, totals.today / goal * 100)}%"></span></div><p>${totals.today >= goal ? 'Keep exploring whenever you like.' : `${Math.max(0, goal - totals.today)} more to reach your goal. Every try counts.`}</p></section>
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
  if (!session) return;
  stopAudio();
  if (session.question && !session.question.answered) return;
  if (session.question) session.index++;
  if (session.index >= session.queue.length) { page = 'summary'; render(true); return; }
  const word = session.queue[session.index];
  const kind = session.mode === 'listen' ? 'listen' : session.mode === 'mixed' && session.index % 2 === 1 ? 'picture' : 'read';
  session.question = { word, kind, options: pictureChoices(word), answered: false, chosen: null, revealed: false };
  render(true);
  if (kind === 'listen' || (kind === 'read' && store.state.settings.voice)) speak(word);
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
  if (page !== 'lesson' || !session || session.question.answered) return;
  const q = session.question;
  if (chosen !== null && !q.options.some(w => w.id === chosen)) return;
  q.answered = true; q.chosen = chosen;
  stopAudio();
  const record = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, wordId: q.word.id, chosen, correct: chosen === q.word.id, ts: new Date().toISOString() };
  store.update(state => ({ ...state, answers: [...state.answers, record] }));
  session.records.push(record);
  sounds.play(record.correct, store.state.settings.effects);
  render(); $('#picture-next')?.focus({ preventScroll: true });
}
function renderSummary() {
  const correct = session.records.filter(r => r.correct).length, total = session.records.length;
  const missed = session.records.filter(r => !r.correct).map(r => wordById(r.wordId));
  const totals = pictureTotals(store.state);
  main.innerHTML = `<section class="picture-summary"><div class="eyebrow">LESSON COMPLETE</div><h1>${correct === total ? 'Picture perfect!' : 'More words, one step at a time.'}</h1><p>${totals.today >= store.state.settings.goal ? 'You reached your daily goal. Great work!' : `${totals.today} / ${store.state.settings.goal} exercises towards today’s goal.`}</p>
    <div class="summary-stats"><div class="summary-stat"><strong>${correct * 10}</strong><span>XP earned</span></div><div class="summary-stat"><strong>${correct} / ${total}</strong><span>correct answers</span></div></div>
    ${missed.length ? `<h2>Have another look</h2><div class="picture-grid">${missed.map(w => `<button class="picture-word-card" data-speak="${w.id}" aria-label="${canSpeak ? 'Hear' : 'Review'} ${w.en}">${sprite(w)}<strong>${w.en}</strong></button>`).join('')}</div>` : '<p>Come back tomorrow to help these words stick.</p>'}
    <div class="summary-actions">${missed.length ? '<button class="primary-button" data-action="retry">Try missed words</button>' : '<button class="primary-button" data-action="start">Another lesson</button>'}<button class="secondary-button" data-action="home">Back to practice</button></div></section>`;
}
const actions = {
  home() { stopAudio(); session = null; page = 'home'; render(true); },
  words() { stopAudio(); session = null; page = 'words'; render(true); },
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
  if (target.dataset.action) actions[target.dataset.action]?.();
  else if (target.dataset.answer) answer(target.dataset.answer);
  else if (target.dataset.speak) speak(wordById(target.dataset.speak));
});
document.addEventListener('change', event => {
  const key = event.target.dataset.setting;
  if (!['category', 'mode', 'goal', 'voice'].includes(key)) return;
  const value = key === 'voice' ? event.target.checked : key === 'goal' ? Number(event.target.value) : event.target.value;
  store.update(state => ({ ...state, settings: { ...state.settings, [key]: value } }));
  render();
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input, select, textarea')) return;
  if (page === 'lesson' && !session.question.answered && /^[1-4]$/.test(event.key)) {
    event.preventDefault(); answer(session.question.options[Number(event.key) - 1].id);
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
window.addEventListener('pagehide', stopAudio);
render();
// Preload every atlas before a scored exercise can start; blank images never become questions.
Promise.all(PICTURE_ATLASES.map(category => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = resolve; image.onerror = reject;
  image.src = new URL(`./assets/picture-${category}.webp?v=2.7.0`, import.meta.url).href;
}))).then(() => { picturesReady = true; render(); }).catch(() => { pictureError = true; render(); });
