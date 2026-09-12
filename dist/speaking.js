// Speech recognition checks intelligibility through recognized words, not phoneme accuracy.
export const SENTENCES = [
  ['hello', 'Hello, how are you today?', 'שלום, מה שלומך היום?'],
  ['book', 'I like to read a book.', 'אני אוהב לקרוא ספר.'],
  ['water', 'Can I have some water, please?', 'אפשר לקבל קצת מים, בבקשה?'],
  ['school', 'I walk to school with my friend.', 'אני הולך לבית הספר עם חבר שלי.'],
  ['sun', 'The sun is shining in the sky.', 'השמש זורחת בשמיים.'],
  ['sister', 'My sister has a little cat.', 'לאחותי יש חתול קטן.'],
  ['breakfast', 'I eat breakfast every morning.', 'אני אוכל ארוחת בוקר בכל בוקר.'],
  ['help', 'Could you help me with this?', 'אפשר לעזור לי עם זה?'],
  ['happy', 'I am happy to see you.', 'אני שמח לראות אותך.'],
  ['garden', 'There are flowers in the garden.', 'יש פרחים בגינה.'],
  ['play', 'We can play together after school.', 'אנחנו יכולים לשחק יחד אחרי הלימודים.'],
  ['weather', 'The weather is warm and sunny.', 'מזג האוויר חמים ושמשי.'],
  ['think', 'I think this is a great idea.', 'אני חושב שזה רעיון נהדר.'],
  ['three', 'There are three birds in the tree.', 'יש שלוש ציפורים על העץ.'],
  ['thanks', 'Thank you for helping me today.', 'תודה שעזרת לי היום.'],
  ['weekend', 'What would you like to do this weekend?', 'מה היית רוצה לעשות בסוף השבוע הזה?'],
  ['remember', 'I cannot remember where I put my bag.', 'אני לא זוכר איפה שמתי את התיק שלי.'],
  ['story', 'She told us a very interesting story.', 'היא סיפרה לנו סיפור מעניין מאוד.'],
  ['rain', 'We stayed inside because it was raining.', 'נשארנו בפנים כי ירד גשם.'],
  ['learn', 'I want to learn something new every day.', 'אני רוצה ללמוד משהו חדש בכל יום.'],
  ['together', 'Everything is easier when we work together.', 'הכול קל יותר כשאנחנו עובדים יחד.'],
  ['favorite', 'My favorite thing to do is ride my bicycle.', 'הדבר שאני הכי אוהב לעשות הוא לרכוב על האופניים שלי.'],
  ['question', 'Please tell me if you have any questions.', 'בבקשה תגיד לי אם יש לך שאלות.'],
  ['tomorrow', 'I am looking forward to seeing you tomorrow.', 'אני מצפה לראות אותך מחר.'],
  ['family', 'My family likes to cook dinner together.', 'המשפחה שלי אוהבת לבשל ארוחת ערב יחד.'],
  ['colors', 'The little bird has blue and yellow feathers.', 'לציפור הקטנה יש נוצות כחולות וצהובות.'],
  ['shopping', 'We need some apples and bread from the shop.', 'אנחנו צריכים כמה תפוחים ולחם מהחנות.'],
  ['time', 'What time does the movie start tonight?', 'באיזו שעה הסרט מתחיל הערב?'],
  ['visit', 'I would love to visit a new country.', 'אשמח לבקר במדינה חדשה.'],
  ['practice', 'A little practice helps me improve every day.', 'קצת תרגול עוזר לי להשתפר בכל יום.'],
].map(([id, en, he]) => ({ id, en, he }));
const expansions = { "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is', "we're": 'we are', "they're": 'they are', "can't": 'can not', cannot: 'can not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "won't": 'will not', "i'll": 'i will', "i've": 'i have', "let's": 'let us', "that's": 'that is', "there's": 'there is', "what's": 'what is' };
const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
function tokens(text) {
  const words = String(text).normalize('NFKC').replace(/[’‘]/g, "'").match(/[a-zA-Z0-9]+(?:'[a-zA-Z]+)?/g)?.slice(0, 100) || [];
  return { words, tokens: words.flatMap((word, index) => (expansions[word.toLowerCase()] || (/^\d+$/.test(word) && numbers[Number(word)]) || word.toLowerCase()).split(' ').map(value => ({ value, index }))) };
}
export function assessSpeech(expected, transcript) {
  const target = tokens(expected), heard = tokens(transcript);
  const a = target.tokens, b = heard.tokens;
  const grid = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i ? (j ? 0 : i) : j));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + (a[i - 1].value === b[j - 1].value ? 0 : 1));
  const correct = new Set(); let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && grid[i][j] === grid[i - 1][j - 1] + (a[i - 1].value === b[j - 1].value ? 0 : 1)) { if (a[i - 1].value === b[j - 1].value) correct.add(i - 1); i--; j--; }
    else if (i && grid[i][j] === grid[i - 1][j] + 1) i--;
    else j--;
  }
  return { score: a.length && b.length ? Math.max(0, Math.round(100 * (1 - grid[a.length][b.length] / Math.max(a.length, b.length)))) : 0, matched: correct.size, total: a.length, words: target.words.map((text, index) => ({ text, correct: a.every((token, k) => token.index !== index || correct.has(k)) })) };
}
const dayOf = ts => { const date = new Date(ts); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
export function cleanSpeaking(records) {
  if (!Array.isArray(records)) return [];
  return records.slice(-50000).flatMap(record => {
    const sentence = SENTENCES.find(s => s.id === record?.sentenceId);
    if (!sentence || !Number.isFinite(Date.parse(record.ts)) || typeof record.transcript !== 'string' || !tokens(record.transcript).tokens.length) return [];
    const ts = new Date(record.ts).toISOString(), transcript = record.transcript.slice(0, 500);
    return [{ id: `${dayOf(ts)}:${sentence.id}`, sentenceId: sentence.id, ts, transcript, score: assessSpeech(sentence.en, transcript).score }];
  });
}
export function mergeSpeaking(a, b) {
  const records = new Map();
  for (const record of cleanSpeaking([...a, ...b])) {
    const previous = records.get(record.id);
    if (!previous || record.score > previous.score || (record.score === previous.score && record.ts > previous.ts)) records.set(record.id, record);
  }
  return [...records.values()].sort((a, b) => a.ts.localeCompare(b.ts));
}
export function createSpeechCapture(callbacks, host = globalThis) {
  const Recognition = host.SpeechRecognition || host.webkitSpeechRecognition;
  let active = null, timer = null;
  const clear = () => { if (timer !== null) host.clearTimeout(timer); timer = null; };
  function cancel() { const previous = active; active = null; clear(); if (previous) { try { previous.abort(); } catch { /* Already closed. */ } } }
  const supported = Boolean(Recognition) && host.isSecureContext !== false;
  function start() {
    cancel();
    if (!supported) { callbacks.onError('unsupported'); return false; }
    try {
      const recognition = new Recognition(); active = recognition;
      recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (active === recognition) callbacks.onState('listening', ''); };
      recognition.onresult = event => {
        if (active !== recognition) return;
        const results = Array.from(event.results);
        const final = results.filter(result => result.isFinal).map(result => result[0]?.transcript || '').join(' ').trim();
        if (final) { cancel(); callbacks.onResult(final.slice(0, 500)); }
        else callbacks.onState('listening', results.map(result => result[0]?.transcript || '').join(' ').slice(0, 500));
      };
      recognition.onerror = event => { if (active !== recognition) return; cancel(); callbacks.onError(event.error || 'unknown'); };
      recognition.onend = () => { if (active !== recognition) return; active = null; clear(); callbacks.onError('no-speech'); };
      callbacks.onState('starting', ''); recognition.start();
      timer = host.setTimeout(() => { if (active === recognition) stop(); }, 20000);
      return true;
    } catch { cancel(); callbacks.onError('unavailable'); return false; }
  }
  function stop() {
    if (!active) return;
    const recognition = active; clear(); callbacks.onState('processing', '');
    try { recognition.stop(); } catch { cancel(); callbacks.onError('unavailable'); return; }
    timer = host.setTimeout(() => { if (active === recognition) { cancel(); callbacks.onError('network'); } }, 5000);
  }
  return { supported, start, stop, cancel };
}
