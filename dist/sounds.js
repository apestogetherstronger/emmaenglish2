// Small, locally synthesized feedback sounds. No audio downloads or permissions.
export function createAnswerSounds(host = globalThis) {
  let context;
  const active = new Set();
  function stop() {
    for (const oscillator of active) { try { oscillator.stop(); } catch { /* Already stopped. */ } }
    active.clear();
  }
  function play(correct, enabled = true) {
    stop();
    if (!enabled) return;
    const AudioContext = host.AudioContext || host.webkitAudioContext;
    if (!AudioContext) return;
    try {
      context ||= new AudioContext();
      // This method is called directly from an answer click or key press.
      if (context.state === 'suspended') context.resume().catch(() => {});
      const notes = correct ? [[523.25, 0], [659.25, 0.085], [783.99, 0.17]] : [[233.08, 0], [174.61, 0.13]];
      for (const [frequency, offset] of notes) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = context.currentTime + offset, duration = correct ? 0.22 : 0.18;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        active.add(oscillator); oscillator.start(start); oscillator.stop(start + duration + 0.01);
      }
    } catch { /* Audio support must never block an answer or its visual feedback. */ }
  }
  return { play, stop };
}
