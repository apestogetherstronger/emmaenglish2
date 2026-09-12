// Small, locally synthesized feedback sounds. No audio downloads or permissions.
export function createAnswerSounds(host = globalThis) {
  let context;
  const active = new Set();
  function stop() {
    for (const oscillator of active) { try { oscillator.stop(); } catch { /* Already stopped. */ } }
    active.clear();
  }
  function prepare(enabled = true) {
    if (!enabled) return false;
    const AudioContext = host.AudioContext || host.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      if (!context || context.state === 'closed') context = new AudioContext();
      // Call during the click, before awaiting the treasure's cross-tab lock.
      if (['suspended', 'interrupted'].includes(context.state)) context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  function sequence(notes, enabled, type = 'sine', volume = 0.09) {
    stop();
    if (!prepare(enabled)) return;
    try {
      for (const [frequency, offset, duration = 0.22] of notes) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        active.add(oscillator); oscillator.start(start); oscillator.stop(start + duration + 0.01);
      }
    } catch { /* Audio support must never block an answer or its visual feedback. */ }
  }
  function play(correct, enabled = true) {
    // A bright rising success chord; a rounded descending "try again" tone.
    sequence(correct ? [[523.25, 0], [659.25, 0.085], [783.99, 0.17]] : [[349.23, 0, 0.2], [261.63, 0.16, 0.3]], enabled, correct ? 'sine' : 'triangle', correct ? 0.09 : 0.12);
  }
  function playTreasure(tap, enabled = true) {
    const notes = {
      1: [[392, 0, 0.18]],
      2: [[523.25, 0, 0.18], [659.25, 0.085, 0.23]],
      3: [[783.99, 0, 0.2], [987.77, 0.075, 0.23], [1174.66, 0.15, 0.27], [1567.98, 0.225, 0.34]],
    };
    if (!Number.isInteger(tap) || !notes[tap]) return;
    sequence(notes[tap], enabled, tap === 3 ? 'sine' : 'triangle', 0.11);
  }
  return { play, playTreasure, prepare, stop };
}
