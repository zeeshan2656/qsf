/**
 * Generates 15 original, royalty-free broadcast & UI sound effects (44.1kHz Stereo 16-bit WAV)
 * into public/audio/sfx/ for QSF Video Studio's built-in Sound Effects Library.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '../public/audio/sfx');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SR = 44100;

function writeWav(filename, durationSec, generator) {
  const numSamples = Math.floor(durationSec * SR);
  const channels = 2;
  const dataBytes = numSamples * channels * 2;
  const buf = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };

  let lpL = 0, lpR = 0;
  const ctx = {
    rand,
    lp: (inL, inR, alpha) => {
      lpL += alpha * (inL - lpL);
      lpR += alpha * (inR - lpR);
      return [lpL, lpR];
    }
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const p = i / numSamples;
    const [rawL, rawR] = generator(t, p, ctx);
    // Smooth 8ms edge fade to guarantee zero click
    const fadeEdge = Math.min(1, i / (SR * 0.008), (numSamples - 1 - i) / (SR * 0.008));
    const clL = Math.max(-0.96, Math.min(0.96, rawL * fadeEdge));
    const clR = Math.max(-0.96, Math.min(0.96, rawR * fadeEdge));
    buf.writeInt16LE(Math.round(clL * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clR * 32767), 44 + i * 4 + 2);
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), buf);
}

const pi2 = Math.PI * 2;

// 1. Breaking News Alert (urgent 3-pulse broadcast chime)
writeWav('breaking_news_alert.wav', 1.6, (t) => {
  const pulse = (t % 0.38) < 0.24 ? Math.exp(-((t % 0.38) * 9)) : 0;
  const f1 = 880, f2 = 1318.5;
  const s = (Math.sin(pi2 * f1 * t) * 0.6 + Math.sin(pi2 * f2 * t) * 0.4) * pulse * 0.85;
  return [s, s];
});

// 2. News Intro (dramatic newsroom orchestral chord + driving pulse)
writeWav('news_intro.wav', 2.4, (t, p) => {
  const env = Math.min(1, t / 0.12) * Math.exp(-Math.max(0, t - 1.4) * 2.5);
  const beat = 0.75 + 0.25 * Math.sin(pi2 * 6 * t);
  const chord =
    Math.sin(pi2 * 146.8 * t) * 0.35 +
    Math.sin(pi2 * 220.0 * t) * 0.28 +
    Math.sin(pi2 * 293.7 * t) * 0.24 +
    Math.sin(pi2 * 440.0 * t) * 0.18 +
    Math.sin(pi2 * 587.3 * t) * 0.12 * (1 - p * 0.4);
  const s = chord * env * beat * 0.85;
  return [s, s * 0.96];
});

// 3. News Transition (crisp broadcast sweep + chime accent)
writeWav('news_transition.wav', 0.9, (t, p, ctx) => {
  const sweepEnv = Math.sin(Math.PI * p);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.04 + 0.22 * p);
  const chime = Math.sin(pi2 * (523.25 + p * 261.6) * t) * Math.exp(-Math.abs(t - 0.45) * 14) * 0.55;
  return [nL * sweepEnv * 0.45 + chime, nR * sweepEnv * 0.45 + chime];
});

// 4. Notification Alert (clean modern dual-tone bell)
writeWav('notification_alert.wav', 0.75, (t) => {
  const n1 = t < 0.28 ? Math.sin(pi2 * 784 * t) * Math.exp(-t * 11) : 0;
  const n2 = t >= 0.18 ? Math.sin(pi2 * 1046.5 * (t - 0.18)) * Math.exp(-(t - 0.18) * 8) : 0;
  const s = (n1 * 0.55 + n2 * 0.7) * 0.85;
  return [s, s];
});

// 5. Short Beep (broadcast studio pip)
writeWav('short_beep.wav', 0.28, (t) => {
  const env = Math.exp(-t * 9);
  const s = Math.sin(pi2 * 1000 * t) * env * 0.75;
  return [s, s];
});

// 6. Whoosh (stereo air swoosh)
writeWav('whoosh.wav', 0.8, (t, p, ctx) => {
  const env = Math.pow(Math.sin(Math.PI * p), 1.4);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.02 + 0.35 * Math.sin(Math.PI * p));
  return [nL * env * 0.95 * (1.2 - p * 0.4), nR * env * 0.95 * (0.8 + p * 0.4)];
});

// 7. Impact (deep sub-bass boom + punch)
writeWav('impact.wav', 1.1, (t, p, ctx) => {
  const freq = 135 * Math.exp(-t * 8) + 38;
  const boom = Math.sin(pi2 * freq * t) * Math.exp(-t * 3.4);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.28);
  const crack = nL * Math.exp(-t * 38) * 0.6;
  return [(boom * 0.85 + crack), (boom * 0.85 + nR * Math.exp(-t * 38) * 0.6)];
});

// 8. Camera Shutter (dual mechanical click)
writeWav('camera_shutter.wav', 0.32, (t, p, ctx) => {
  const click1 = Math.exp(-t * 95);
  const click2 = t > 0.09 ? Math.exp(-(t - 0.09) * 85) * 0.85 : 0;
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.55);
  const body = Math.sin(pi2 * 420 * t) * click1 * 0.3;
  return [(nL * (click1 + click2) + body) * 0.9, (nR * (click1 + click2) + body) * 0.9];
});

// 9. Crowd Ambience (gentle warm filtered crowd murmur)
writeWav('crowd_ambience.wav', 3.0, (t, p, ctx) => {
  const modL = 0.7 + 0.3 * Math.sin(pi2 * 0.45 * t);
  const modR = 0.7 + 0.3 * Math.cos(pi2 * 0.38 * t);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.06);
  const env = Math.min(1, t / 0.35, (3.0 - t) / 0.45);
  return [nL * modL * env * 0.65, nR * modR * env * 0.65];
});

// 10. Applause (dense multi-burst stereo claps)
writeWav('applause.wav', 2.4, (t, p, ctx) => {
  const env = Math.min(1, t / 0.25) * Math.exp(-Math.max(0, t - 1.3) * 2.2);
  const burstL = Math.pow(0.5 + 0.5 * Math.sin(pi2 * 13.7 * t + Math.sin(pi2 * 5.3 * t)), 3);
  const burstR = Math.pow(0.5 + 0.5 * Math.cos(pi2 * 15.1 * t + Math.sin(pi2 * 4.7 * t)), 3);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.32);
  return [nL * (0.45 + 0.55 * burstL) * env * 0.85, nR * (0.45 + 0.55 * burstR) * env * 0.85];
});

// 11. Drum Roll (accelerating snare pulses rising into cymbal hit)
writeWav('drum_roll.wav', 2.0, (t, p, ctx) => {
  const rate = 10 + p * 18;
  const hit = Math.pow(Math.max(0, Math.sin(pi2 * rate * t)), 6);
  const rise = 0.25 + 0.75 * p;
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.42);
  const tone = Math.sin(pi2 * 195 * t) * hit * 0.4;
  const finale = t > 1.72 ? Math.exp(-(t - 1.72) * 8) * (nL * 0.6 + Math.sin(pi2 * 120 * t) * 0.5) : 0;
  return [((nL * 0.55 + tone) * hit * rise + finale) * 0.8, ((nR * 0.55 + tone) * hit * rise + finale) * 0.8];
});

// 12. Cinematic Rise (building harmonic tension swell)
writeWav('cinematic_rise.wav', 2.2, (t, p, ctx) => {
  const freq = 90 + Math.pow(p, 2.2) * 520;
  const env = Math.pow(p, 1.3) * (p > 0.94 ? (1 - (p - 0.94) / 0.06) : 1);
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.03 + 0.3 * p);
  const synth = Math.sin(pi2 * freq * t) * 0.5 + Math.sin(pi2 * freq * 1.5 * t) * 0.28;
  return [(synth + nL * 0.35) * env * 0.85, (synth + nR * 0.35) * env * 0.85];
});

// 13. Dramatic Hit (cinema trailer boom + metallic shimmer)
writeWav('dramatic_hit.wav', 1.4, (t, p, ctx) => {
  const f = 95 * Math.exp(-t * 5) + 36;
  const sub = Math.sin(pi2 * f * t) * Math.exp(-t * 2.4);
  const metallic = (Math.sin(pi2 * 412 * t) + Math.sin(pi2 * 619 * t)) * Math.exp(-t * 7.5) * 0.25;
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.38);
  const snap = nL * Math.exp(-t * 24) * 0.55;
  return [(sub * 0.8 + metallic + snap), (sub * 0.8 + metallic + nR * Math.exp(-t * 24) * 0.55)];
});

// 14. Soft Transition (warm gentle atmospheric swell)
writeWav('soft_transition.wav', 1.1, (t, p, ctx) => {
  const env = Math.sin(Math.PI * p);
  const pad = Math.sin(pi2 * 330 * t) * 0.35 + Math.sin(pi2 * 495 * t) * 0.2;
  const [nL, nR] = ctx.lp(ctx.rand(), ctx.rand(), 0.08);
  return [(pad + nL * 0.2) * env * 0.7, (pad + nR * 0.2) * env * 0.7];
});

// 15. Success Notification (bright ascending major arpeggio)
writeWav('success_notification.wav', 0.95, (t) => {
  const notes = [
    { start: 0.0, f: 523.25 },
    { start: 0.11, f: 659.25 },
    { start: 0.22, f: 783.99 },
    { start: 0.33, f: 1046.5 }
  ];
  let sum = 0;
  for (const n of notes) {
    if (t >= n.start) {
      const dt = t - n.start;
      sum += Math.sin(pi2 * n.f * dt) * Math.exp(-dt * 7.5) * 0.4;
    }
  }
  return [sum, sum];
});

console.log('[SFX Generator] Created 15 broadcast WAV sound effects in', OUT_DIR);
