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

/**
 * 6. Dial-up Modem Negotiation Sound
 * Programmatically synthesizes the iconic 14.4k dial-up sequence:
 * - Telephone Off-Hook & Dialtone (0.0s - 0.6s)
 * - DTMF Tone Dialing for 1-800-C-O-M-P-L-Y (0.7s - 2.1s)
 * - Telephone Line Ringback Tones (2.2s - 3.8s)
 * - High-Pitched CED Answering Tone (3.9s - 4.7s)
 * - Classic Screeching Vibrato and Filter-Swept Static Hiss (4.7s - 7.8s)
 * Returns a controller handle with a .stop() method for real-time muting.
 */
export function playSynthDialup() {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  const now = ctx.currentTime;
  const limiter = createLimiter(ctx);
  limiter.connect(ctx.destination);

  // Master Gain to enable global volume and quick muting
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.08, now); // Moderate comfortable volume
  masterGain.connect(limiter);

  const activeNodes = [];

  // Helper to register and start nodes
  const registerNode = (node, startTime) => {
    activeNodes.push(node);
    node.start(startTime);
  };

  // --- Phase 1: Off-hook and Dial Tone (0.0s to 0.6s) ---
  const dialToneOsc1 = ctx.createOscillator();
  dialToneOsc1.type = "sine";
  dialToneOsc1.frequency.setValueAtTime(350, now);

  const dialToneOsc2 = ctx.createOscillator();
  dialToneOsc2.type = "sine";
  dialToneOsc2.frequency.setValueAtTime(440, now);

  const dialToneGain = ctx.createGain();
  dialToneGain.gain.setValueAtTime(0.2, now);
  dialToneGain.gain.setValueAtTime(0.2, now + 0.5);
  dialToneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

  dialToneOsc1.connect(dialToneGain);
  dialToneOsc2.connect(dialToneGain);
  dialToneGain.connect(masterGain);

  registerNode(dialToneOsc1, now);
  registerNode(dialToneOsc2, now);
  dialToneOsc1.stop(now + 0.6);
  dialToneOsc2.stop(now + 0.6);

  // --- Phase 2: DTMF Dialing (0.7s to 2.1s) ---
  // Digits: 1 - 8 - 0 - 0 - 2 - 6 - 6
  const dtmfDigits = [
    { low: 697, high: 1209 }, // 1
    { low: 852, high: 1336 }, // 8
    { low: 941, high: 1336 }, // 0
    { low: 941, high: 1336 }, // 0
    { low: 697, high: 1336 }, // 2
    { low: 770, high: 1477 }, // 6
    { low: 770, high: 1477 }, // 6
  ];

  const digitDuration = 0.08;
  const silenceDuration = 0.06;
  const startOffset = 0.7;

  dtmfDigits.forEach((digit, idx) => {
    const digitTime = now + startOffset + idx * (digitDuration + silenceDuration);

    const oscLow = ctx.createOscillator();
    oscLow.type = "sine";
    oscLow.frequency.setValueAtTime(digit.low, digitTime);

    const oscHigh = ctx.createOscillator();
    oscHigh.type = "sine";
    oscHigh.frequency.setValueAtTime(digit.high, digitTime);

    const digitGain = ctx.createGain();
    digitGain.gain.setValueAtTime(0.12, digitTime);
    digitGain.gain.setValueAtTime(0.12, digitTime + digitDuration - 0.005);
    digitGain.gain.exponentialRampToValueAtTime(0.0001, digitTime + digitDuration);

    oscLow.connect(digitGain);
    oscHigh.connect(digitGain);
    digitGain.connect(masterGain);

    registerNode(oscLow, digitTime);
    registerNode(oscHigh, digitTime);
    oscLow.stop(digitTime + digitDuration);
    oscHigh.stop(digitTime + digitDuration);
  });

  // --- Phase 3: Phone Ringing (2.2s to 3.8s) ---
  // Simple retro telephone ringback tones at 2.2s and 3.1s
  const rings = [2.2, 3.1];
  rings.forEach((ringStart) => {
    const ringTime = now + ringStart;
    const ringDur = 0.65;

    const ringOsc1 = ctx.createOscillator();
    ringOsc1.type = "sine";
    ringOsc1.frequency.setValueAtTime(440, ringTime);

    const ringOsc2 = ctx.createOscillator();
    ringOsc2.type = "sine";
    ringOsc2.frequency.setValueAtTime(480, ringTime);

    // Ring tone vibrato/pulsing using a gain node modulated by a 20Hz square LFO
    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0.12, ringTime);
    pulseGain.gain.setValueAtTime(0.12, ringTime + ringDur - 0.02);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, ringTime + ringDur);

    ringOsc1.connect(pulseGain);
    ringOsc2.connect(pulseGain);
    pulseGain.connect(masterGain);

    registerNode(ringOsc1, ringTime);
    registerNode(ringOsc2, ringTime);
    ringOsc1.stop(ringTime + ringDur);
    ringOsc2.stop(ringTime + ringDur);
  });

  // --- Phase 4: Answering Carrier Tone (3.9s to 4.7s) ---
  // High-pitched 2100Hz answering tone (CED tone)
  const cedTime = now + 3.9;
  const cedDur = 0.8;

  const cedOsc = ctx.createOscillator();
  cedOsc.type = "sine";
  cedOsc.frequency.setValueAtTime(2100, cedTime);

  const cedGain = ctx.createGain();
  cedGain.gain.setValueAtTime(0, cedTime);
  cedGain.gain.linearRampToValueAtTime(0.1, cedTime + 0.05);
  cedGain.gain.setValueAtTime(0.1, cedTime + cedDur - 0.05);
  cedGain.gain.exponentialRampToValueAtTime(0.0001, cedTime + cedDur);

  cedOsc.connect(cedGain);
  cedGain.connect(masterGain);

  registerNode(cedOsc, cedTime);
  cedOsc.stop(cedTime + cedDur);

  // --- Phase 5: Modem Screech and Static Handshake (4.7s to 7.8s) ---
  const screechStart = now + 4.7;
  const screechDur = 3.1;
  const screechStop = screechStart + screechDur;

  // 1. Sawtooth Screech with sweep and vibrato
  const screechOsc = ctx.createOscillator();
  screechOsc.type = "sawtooth";
  screechOsc.frequency.setValueAtTime(600, screechStart);
  
  // Frequency sweeps and jumps
  screechOsc.frequency.linearRampToValueAtTime(1400, screechStart + 0.6);
  screechOsc.frequency.setValueAtTime(900, screechStart + 0.8);
  screechOsc.frequency.linearRampToValueAtTime(1200, screechStart + 1.4);
  screechOsc.frequency.setValueAtTime(700, screechStart + 1.6);
  screechOsc.frequency.linearRampToValueAtTime(2200, screechStart + 2.2);

  // 12Hz Vibrato LFO (Triangle) to modulate frequency during screech
  const lfo = ctx.createOscillator();
  lfo.type = "triangle";
  lfo.frequency.setValueAtTime(12, screechStart);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(180, screechStart);

  lfo.connect(lfoGain);
  lfoGain.connect(screechOsc.frequency);

  // Bandpass filter to tame the sawtooth and make it sound like a telephone receiver
  const screechFilter = ctx.createBiquadFilter();
  screechFilter.type = "bandpass";
  screechFilter.frequency.setValueAtTime(1000, screechStart);
  screechFilter.frequency.linearRampToValueAtTime(2000, screechStart + 1.5);
  screechFilter.Q.setValueAtTime(1.5, screechStart);

  const screechGain = ctx.createGain();
  screechGain.gain.setValueAtTime(0, screechStart);
  screechGain.gain.linearRampToValueAtTime(0.04, screechStart + 0.05);
  screechGain.gain.setValueAtTime(0.04, screechStart + 2.5);
  screechGain.gain.exponentialRampToValueAtTime(0.0001, screechStop);

  screechOsc.connect(screechFilter);
  screechFilter.connect(screechGain);
  screechGain.connect(masterGain);

  registerNode(screechOsc, screechStart);
  registerNode(lfo, screechStart);
  screechOsc.stop(screechStop);
  lfo.stop(screechStop);

  // 2. White Noise static hiss sweep
  const noiseBufferSize = ctx.sampleRate * screechDur;
  const noiseBuffer = ctx.createBuffer(1, Math.floor(noiseBufferSize), ctx.sampleRate);
  const noiseChannel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < Math.floor(noiseBufferSize); i++) {
    noiseChannel[i] = Math.random() * 2.0 - 1.0;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(1200, screechStart);
  noiseFilter.frequency.linearRampToValueAtTime(2800, screechStart + 1.2);
  noiseFilter.frequency.linearRampToValueAtTime(800, screechStart + 2.2);
  noiseFilter.Q.setValueAtTime(1.2, screechStart);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, screechStart);
  noiseGain.gain.linearRampToValueAtTime(0.05, screechStart + 0.1);
  noiseGain.gain.setValueAtTime(0.05, screechStart + 2.5);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, screechStop);

  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  registerNode(noiseNode, screechStart);
  noiseNode.stop(screechStop);

  // 3. Beeping negotiation tones near the end
  const beepTime = screechStart + 2.0;
  const beepDur = 0.9;
  
  const beepOsc = ctx.createOscillator();
  beepOsc.type = "sine";
  beepOsc.frequency.setValueAtTime(2225, beepTime);
  beepOsc.frequency.setValueAtTime(2025, beepTime + 0.25);
  beepOsc.frequency.setValueAtTime(2225, beepTime + 0.5);

  const beepGain = ctx.createGain();
  beepGain.gain.setValueAtTime(0, beepTime);
  beepGain.gain.linearRampToValueAtTime(0.04, beepTime + 0.02);
  beepGain.gain.setValueAtTime(0.04, beepTime + beepDur - 0.05);
  beepGain.gain.exponentialRampToValueAtTime(0.0001, beepTime + beepDur);

  beepOsc.connect(beepGain);
  beepGain.connect(masterGain);

  registerNode(beepOsc, beepTime);
  beepOsc.stop(beepTime + beepDur);

  // Return a controller object to stop sound instantly
  return {
    stop: () => {
      try {
        const stopTime = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(stopTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);

        setTimeout(() => {
          activeNodes.forEach((node) => {
            try {
              node.stop();
            } catch (e) {}
          });
        }, 100);
      } catch (err) {
        console.error("Error stopping dialup synth:", err);
      }
    },
  };
}


