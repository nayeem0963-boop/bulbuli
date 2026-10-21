// Tiny synthesized sound effects (Web Audio). No audio files to ship or load.
import { settings } from '../../state/settings.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.16, slide } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

const SOUNDS = {
  click: () => tone(520, 0, 0.06, { type: 'triangle', gain: 0.1 }),
  start: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.14, { type: 'triangle' })),
  correct: (streak = 0) => {
    const lift = 1 + Math.min(streak, 5) * 0.06; // pitch climbs with your streak
    tone(660 * lift, 0, 0.12, { type: 'triangle' });
    tone(880 * lift, 0.09, 0.2, { type: 'triangle' });
  },
  wrong: () => tone(240, 0, 0.3, { type: 'sawtooth', gain: 0.08, slide: 130 }),
  tick: () => tone(900, 0, 0.04, { type: 'square', gain: 0.04 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.5 : 0.16, { type: 'triangle' })),
  over: () => [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.12, 0.2, { type: 'triangle' })),
  whoosh: () => tone(300, 0, 0.18, { type: 'sine', gain: 0.05, slide: 900 }),
  chirp: () => {
    tone(1800, 0, 0.09, { gain: 0.09, slide: 2700 });
    tone(2500, 0.11, 0.11, { gain: 0.09, slide: 1800 });
  },
};

/** @param {keyof typeof SOUNDS} name */
export function play(name, arg) {
  if (settings.get().muted) return;
  try { SOUNDS[name]?.(arg); } catch { /* audio is optional */ }
}

export const vibrate = (ms) => navigator.vibrate?.(ms);
