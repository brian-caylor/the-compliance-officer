/**
 * Retro Windows 95 Sound Effects Engine (Programmatic Web Audio Synthesis)
 *
 * This file contains purely synthesized approximations of classic Windows 95 sounds:
 * - Chimes (startup chimes.wav)
 * - Chord (warning chord.wav)
 * - Ding (notification ding.wav)
 * - Tada (success tada.wav)
 *
 * Designed to be lightweight, self-contained, and run 100% offline.
 */

let audioCtx = null;

/**
 * Initializes or resumes the AudioContext on user interaction.
 * Crucial to satisfy browser security policies on audio autoplay.
 */
export function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Helper to create a compressor node to prevent clipping and glue the sound together.
 */
function createLimiter(ctx) {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-12, ctx.currentTime);
  compressor.knee.setValueAtTime(4, ctx.currentTime);
  compressor.ratio.setValueAtTime(12, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.08, ctx.currentTime);
  return compressor;
}

/**
 * 1. Chimes (chimes.wav - Startup sequence)
 * Ascending, sparkling FM-ish bell cascade with beautiful overlapping delays.
 */
export function playSynthChimes() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Sparkling ascending chime notes
  const notes = [
    { freq: 523.25, time: 0.00 },  // C5
    { freq: 659.25, time: 0.05 },  // E5
    { freq: 783.99, time: 0.10 },  // G5
    { freq: 1046.50, time: 0.15 }, // C6
    { freq: 1318.51, time: 0.20 }, // E6
    { freq: 1567.98, time: 0.25 }, // G6
    { freq: 2093.00, time: 0.30 }, // C7
    { freq: 2637.02, time: 0.35 }, // E7
    { freq: 3135.96, time: 0.40 }, // G7
    { freq: 4186.01, time: 0.45 }, // C8
  ];

  notes.forEach(({ freq, time }) => {
    const noteTime = now + time;
    
    // Primary chime node (Sine for pure tone)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, noteTime);

    // Harmonic bell-like overtone (Frequency * 2.003 for high-frequency metallic ring)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2.003, noteTime);

    // Subtle sub-harmonic warmth (Frequency * 0.5)
    const osc3 = ctx.createOscillator();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(freq * 0.5, noteTime);

    // Individual note gain envelope
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, noteTime);
    noteGain.gain.linearRampToValueAtTime(0.08, noteTime + 0.005); // Rapid attack
    noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.7); // Lingering tail

    // Connections
    osc1.connect(noteGain);
    osc2.connect(noteGain);
    
    // Lower volume for the sub-harmonic warmth
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.03, noteTime);
    osc3.connect(subGain);
    subGain.connect(noteGain);

    noteGain.connect(limiter);

    // Play & cleanup
    osc1.start(noteTime);
    osc2.start(noteTime);
    osc3.start(noteTime);

    osc1.stop(noteTime + 0.8);
    osc2.stop(noteTime + 0.8);
    osc3.stop(noteTime + 0.8);
  });
}

/**
 * 2. Chord (chord.wav - Warning/Error)
 * Low, thick, detuned organ-like warning triad (C3-Eb3-G3-C4 or similar).
 */
export function playSynthChord() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Classic Win95 chord is Eb3/Ab3/C4-ish or C3/E3/G3/C4
  // Let's use Eb3 (155.56 Hz), Ab3 (207.65 Hz), C4 (261.63 Hz), Eb4 (311.13 Hz)
  const chordNotes = [155.56, 207.65, 261.63, 311.13];

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(0.35, now + 0.01); // Instant warning slap
  mainGain.gain.setValueAtTime(0.35, now + 0.25);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8); // Moderate decay
  mainGain.connect(limiter);

  chordNotes.forEach((freq) => {
    // Triangle wave for base body
    const oscTri = ctx.createOscillator();
    oscTri.type = "triangle";
    oscTri.frequency.setValueAtTime(freq, now);
    oscTri.detune.setValueAtTime(-5, now); // Detuned left

    // Sawtooth wave for retro crunch/brass bite
    const oscSaw = ctx.createOscillator();
    oscSaw.type = "sawtooth";
    oscSaw.frequency.setValueAtTime(freq, now);
    oscSaw.detune.setValueAtTime(5, now); // Detuned right

    // Separate level balances to avoid harsh sawtooth dominance
    const triGain = ctx.createGain();
    triGain.gain.setValueAtTime(0.4, now);

    const sawGain = ctx.createGain();
    sawGain.gain.setValueAtTime(0.12, now);

    // Apply a low-pass filter to make it sound warm and retro (cuts the harsh high saw frequencies)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.5);

    oscTri.connect(triGain);
    oscSaw.connect(sawGain);

    triGain.connect(filter);
    sawGain.connect(filter);

    filter.connect(mainGain);

    oscTri.start(now);
    oscSaw.start(now);

    oscTri.stop(now + 0.9);
    oscSaw.stop(now + 0.9);
  });
}

/**
 * 3. Ding (ding.wav - Helper notification / Clip appearance)
 * High-frequency clean sine-wave bell with rapid exponential decay.
 */
export function playSynthDing() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Pure ding frequency (approx F#6 / G6 area)
  const fundamental = 1760.00; // A6

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(0.28, now + 0.002); // Super-fast click attack
  mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5); // Decay
  mainGain.connect(limiter);

  // Additive bells: Fundamental sine + crisp metallic harmonics
  const harmonics = [
    { multiplier: 1.0, vol: 0.6 },
    { multiplier: 2.01, vol: 0.25 },
    { multiplier: 3.025, vol: 0.12 },
    { multiplier: 4.4, vol: 0.05 },
  ];

  harmonics.forEach(({ multiplier, vol }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(fundamental * multiplier, now);

    const hGain = ctx.createGain();
    hGain.gain.setValueAtTime(vol, now);

    osc.connect(hGain);
    hGain.connect(mainGain);

    osc.start(now);
    osc.stop(now + 0.6);
  });
}

/**
 * 4. Tada (tada.wav - Achievement / Approval Success)
 * Brassy retro major triad fanfare with vibrato.
 */
export function playSynthTada() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Triumphal melody sequence:
  // Note 1 (short): C4 (261.63 Hz) at t = 0.0s to 0.12s
  // Note 2 (short): C4 (261.63 Hz) at t = 0.13s to 0.25s
  // Chord 3 (long triumphant triad): C4, E4, G4, C5 (261.63, 329.63, 392.00, 523.25 Hz) starting at t = 0.26s

  // Helper to play a brass note/chord
  const playBrassNode = (frequencies, startTime, duration, isSustained = false) => {
    frequencies.forEach((freq) => {
      // Sawtooth osc for classic retro brass bite
      const oscSaw = ctx.createOscillator();
      oscSaw.type = "sawtooth";
      oscSaw.frequency.setValueAtTime(freq, startTime);

      // Triangle osc to round out the bottom end
      const oscTri = ctx.createOscillator();
      oscTri.type = "triangle";
      oscTri.frequency.setValueAtTime(freq, startTime);

      // Lowpass Filter for that classic synth brass envelope
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      
      // Brass filter sweep envelope
      filter.frequency.setValueAtTime(300, startTime);
      filter.frequency.exponentialRampToValueAtTime(2000, startTime + 0.05);
      if (isSustained) {
        filter.frequency.exponentialRampToValueAtTime(1000, startTime + duration);
      }

      // Gain envelopes
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, startTime);
      oscGain.gain.linearRampToValueAtTime(isSustained ? 0.15 : 0.22, startTime + 0.01);
      
      if (isSustained) {
        // Sustained note decay
        oscGain.gain.setValueAtTime(0.15, startTime + duration - 0.3);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      } else {
        // Short notes decay quickly
        oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      }

      // If sustained, add vibrato (LFO)
      if (isSustained) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(5.5, startTime); // 5.5 Hz vibrato
        lfoGain.gain.setValueAtTime(6, startTime); // 6 cents vibrato depth

        lfo.connect(lfoGain);
        lfoGain.connect(oscSaw.frequency); // Modulate oscillator frequency
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }

      // Connections
      const sawVol = ctx.createGain();
      sawVol.gain.setValueAtTime(0.15, startTime);
      const triVol = ctx.createGain();
      triVol.gain.setValueAtTime(0.35, startTime);

      oscSaw.connect(sawVol);
      oscTri.connect(triVol);

      sawVol.connect(filter);
      triVol.connect(filter);

      filter.connect(oscGain);
      oscGain.connect(limiter);

      oscSaw.start(startTime);
      oscTri.start(startTime);

      oscSaw.stop(startTime + duration + 0.1);
      oscTri.stop(startTime + duration + 0.1);
    });
  };

  // Play Note 1
  playBrassNode([261.63], now, 0.11);

  // Play Note 2
  playBrassNode([261.63], now + 0.13, 0.11);

  // Play triumphant major chord C4 + E4 + G4 + C5
  playBrassNode([261.63, 329.63, 392.00, 523.25], now + 0.26, 1.4, true);
}

/**
 * 5. Floppy Disk Stepper Sound (stepper ticks and spindle motor hum)
 * Simulates a retro floppy write head seeking sectors on FAT12 diskette.
 */
export function playSynthFloppyDrive() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Play a spindle motor hum (low hum for 1.8s)
  const humOsc = ctx.createOscillator();
  humOsc.type = "sine";
  humOsc.frequency.setValueAtTime(110, now); // Low hum

  const humGain = ctx.createGain();
  humGain.gain.setValueAtTime(0, now);
  humGain.gain.linearRampToValueAtTime(0.04, now + 0.1);
  humGain.gain.setValueAtTime(0.04, now + 1.6);
  humGain.gain.linearRampToValueAtTime(0, now + 1.8);

  humOsc.connect(humGain);
  humGain.connect(limiter);
  humOsc.start(now);
  humOsc.stop(now + 1.8);

  // Periodic floppy seek track ticks (stepper motor)
  // Plays 15 ticks spaced over 1.5 seconds, simulating FAT12 write activity
  const tickTimes = [
    0.1, 0.15, 0.2, // quick seek
    0.4, 0.45, 0.5, // write block 1
    0.7, 0.75, 0.8, // write block 2
    1.0, 1.05, 1.1, // write block 3
    1.3, 1.35, 1.4  // seek home/flush cache
  ];

  tickTimes.forEach((time) => {
    const tickTime = now + time;

    // Stepper click: low square wave with instant decay
    const tickOsc = ctx.createOscillator();
    tickOsc.type = "square";
    tickOsc.frequency.setValueAtTime(85, tickTime);

    const tickGain = ctx.createGain();
    tickGain.gain.setValueAtTime(0.06, tickTime);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.025);

    // Filter to damp the square wave and make it sound like a solid "thud" or mechanical head click
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(140, tickTime);
    filter.Q.setValueAtTime(4, tickTime);

    tickOsc.connect(filter);
    filter.connect(tickGain);
    tickGain.connect(limiter);

    tickOsc.start(tickTime);
    tickOsc.stop(tickTime + 0.04);
  });
}

