// 10 Timer alarm sounds using Web Audio API — no external files needed

export interface TimerSound {
  id: string;
  name: string;
  emoji: string;
  play: () => void;
}

function createCtx() {
  return new AudioContext();
}

function playNote(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType = "sine", vol = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(vol, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.1);
}

export const TIMER_SOUNDS: TimerSound[] = [
  {
    id: "zen-bell",
    name: "Zen Bell",
    emoji: "🔔",
    play: () => {
      const ctx = createCtx();
      playNote(ctx, 880, 0, 2);
      playNote(ctx, 660, 0.8, 2.5, "sine", 0.25);
    },
  },
  {
    id: "digital-beep",
    name: "Digital Beep",
    emoji: "📟",
    play: () => {
      const ctx = createCtx();
      for (let i = 0; i < 4; i++) {
        playNote(ctx, 1000, i * 0.3, 0.15, "square", 0.15);
      }
    },
  },
  {
    id: "chime",
    name: "Wind Chime",
    emoji: "🎐",
    play: () => {
      const ctx = createCtx();
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => playNote(ctx, f, i * 0.2, 1.5, "sine", 0.2));
    },
  },
  {
    id: "gong",
    name: "Deep Gong",
    emoji: "🥁",
    play: () => {
      const ctx = createCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
      osc.start();
      osc.stop(ctx.currentTime + 3.5);
    },
  },
  {
    id: "crystal",
    name: "Crystal",
    emoji: "💎",
    play: () => {
      const ctx = createCtx();
      playNote(ctx, 2093, 0, 0.8, "sine", 0.15);
      playNote(ctx, 1568, 0.15, 1, "sine", 0.12);
      playNote(ctx, 2637, 0.3, 1.2, "sine", 0.1);
    },
  },
  {
    id: "meditation",
    name: "Meditation Bowl",
    emoji: "🧘",
    play: () => {
      const ctx = createCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
      osc.start();
      osc.stop(ctx.currentTime + 4.5);
      // Overtone
      playNote(ctx, 440, 0.05, 3, "sine", 0.15);
      playNote(ctx, 660, 0.1, 2.5, "sine", 0.08);
    },
  },
  {
    id: "alarm-clock",
    name: "Alarm Clock",
    emoji: "⏰",
    play: () => {
      const ctx = createCtx();
      for (let i = 0; i < 6; i++) {
        playNote(ctx, 800, i * 0.2, 0.1, "square", 0.12);
        playNote(ctx, 1000, i * 0.2 + 0.1, 0.1, "square", 0.12);
      }
    },
  },
  {
    id: "harp",
    name: "Harp Gliss",
    emoji: "🎵",
    play: () => {
      const ctx = createCtx();
      const notes = [262, 330, 392, 523, 659, 784, 1047];
      notes.forEach((f, i) => playNote(ctx, f, i * 0.12, 1.8, "sine", 0.18));
    },
  },
  {
    id: "ocean",
    name: "Ocean Wave",
    emoji: "🌊",
    play: () => {
      const ctx = createCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 3);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
      osc.start();
      osc.stop(ctx.currentTime + 3.5);
    },
  },
  {
    id: "marimba",
    name: "Marimba",
    emoji: "🎹",
    play: () => {
      const ctx = createCtx();
      const notes = [523, 659, 784, 659, 523];
      notes.forEach((f, i) => playNote(ctx, f, i * 0.25, 0.6, "triangle", 0.25));
    },
  },
];

export function getSoundById(id: string): TimerSound {
  return TIMER_SOUNDS.find(s => s.id === id) || TIMER_SOUNDS[0];
}
