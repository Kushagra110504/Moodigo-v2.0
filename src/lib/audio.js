import { generateScale, buildChord } from './musicTheory.js';

let audioCtx = null;
let activeNodes = [];
let fadeOutTimer = null;
let activeIntervals = []; 

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function stopAudio() {
  if (fadeOutTimer) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
  
  activeIntervals.forEach(interval => clearInterval(interval));
  activeIntervals = [];
  
  activeNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  activeNodes = [];
}

function createReverbBuffer(audioCtx, reverbAmount = 0.5) {
  const duration = 1 + (reverbAmount * 3);
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * (duration / 3)));
      channelData[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return impulse;
}

function createPingPongDelay(ctx, destination, delayTime = 0.4, feedback = 0.4) {
  const merger = ctx.createChannelMerger(2);
  const leftDelay = ctx.createDelay();
  const rightDelay = ctx.createDelay();
  const leftFeedback = ctx.createGain();
  const rightFeedback = ctx.createGain();

  leftDelay.delayTime.value = delayTime;
  rightDelay.delayTime.value = delayTime;
  leftFeedback.gain.value = feedback;
  rightFeedback.gain.value = feedback;

  // Cross feedback loop
  leftDelay.connect(leftFeedback);
  leftFeedback.connect(rightDelay);
  
  rightDelay.connect(rightFeedback);
  rightFeedback.connect(leftDelay);

  // Into merger
  leftDelay.connect(merger, 0, 0);
  rightDelay.connect(merger, 0, 1);
  merger.connect(destination);

  activeNodes.push(leftDelay, rightDelay, leftFeedback, rightFeedback, merger);
  
  // Return the entry points for left/right bouncing
  return { leftDelay, rightDelay };
}

/* =======================================================================
                  INSTRUMENT SYNTHESIS ENGINE
======================================================================= */

function playDrone(ctx, destination, baseFreq) {
  const time = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400; // Deep, muffled
  
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.05; // 20-second sweep
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 600; // Sweep up by 600Hz
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, time);
  masterGain.gain.linearRampToValueAtTime(0.15, time + 5);

  [baseFreq, baseFreq * 1.01, baseFreq * 0.5].forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start(time);
    activeNodes.push(osc);
  });

  lfo.start(time);
  filter.connect(masterGain);
  masterGain.connect(destination);
  
  activeNodes.push(filter, lfo, lfoGain, masterGain);
}

function playProceduralChord(ctx, destination, freqs, time, duration = 4, isSmooth = true) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(isSmooth ? 800 : 2500, time);
  if (isSmooth) {
    filter.frequency.linearRampToValueAtTime(1500, time + duration/2);
    filter.frequency.linearRampToValueAtTime(800, time + duration);
  } else {
    filter.frequency.exponentialRampToValueAtTime(400, time + duration);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  if (isSmooth) {
    gain.gain.linearRampToValueAtTime(0.2, time + duration * 0.3);
    gain.gain.setValueAtTime(0.2, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);
  } else {
    gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }

  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = isSmooth ? 'triangle' : 'square';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + duration);
    activeNodes.push(osc);
  });

  filter.connect(gain);
  gain.connect(destination);
  activeNodes.push(filter, gain);
}

function playArpNote(ctx, delays, destination, freq, time) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.4, time + 0.02); 
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

  osc.connect(gain); 
  gain.connect(destination);
  
  // Tap into ping-pong delay occasionally
  if (Math.random() > 0.5) {
     gain.connect(delays.leftDelay);
  } else {
     gain.connect(delays.rightDelay);
  }

  osc.start(time); osc.stop(time + 1.2);
  activeNodes.push(osc, gain);
}

export function playSoundscape(neuroConfig) {
  initAudio();
  stopAudio();

  const {
    baseFrequency = 110,
    binauralHz = 7,
    spatialSpeed = 0.1,
    reverbAmount = 0.5,
    masterGain = 0.4,
    binauralGain = 0.08,
    musicalKey = 'C',     // Defaults
    scaleType = 'major',
    bpm = 60,
    progression = [1, 4, 6, 5]
  } = neuroConfig;

  console.log('[AudioEngine] Booting procedural music', { musicalKey, scaleType, bpm, progression })

  const now = audioCtx.currentTime;

  // --- Output & Reverb Routing ---
  const mainOut = audioCtx.createGain();
  mainOut.gain.setValueAtTime(0, now);
  mainOut.gain.linearRampToValueAtTime(masterGain, now + 5);
  mainOut.connect(audioCtx.destination);
  activeNodes.push(mainOut);

  const convolver = audioCtx.createConvolver();
  convolver.buffer = createReverbBuffer(audioCtx, reverbAmount);
  
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  dryGain.gain.value = 1 - reverbAmount;
  wetGain.gain.value = reverbAmount;

  dryGain.connect(mainOut);
  convolver.connect(wetGain);
  wetGain.connect(mainOut);
  activeNodes.push(convolver, dryGain, wetGain);

  const sceneMix = audioCtx.createGain();
  sceneMix.gain.value = 1;
  sceneMix.connect(dryGain);
  sceneMix.connect(convolver);
  activeNodes.push(sceneMix);

  // --- Ping-Pong Delay Engine ---
  // Sync delay to the specified BPM (e.g. 60bpm = 1000ms. Dotted 8th note delay is common 0.75 * beat duration)
  const beatDuration = 60 / bpm;
  const delays = createPingPongDelay(audioCtx, sceneMix, beatDuration * 0.75, 0.4);

  // --- Dynamic Spatial Panner ---
  const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : audioCtx.createGain();
  if (audioCtx.createStereoPanner) {
    const panLFO = audioCtx.createOscillator();
    panLFO.type = 'sine';
    panLFO.frequency.value = spatialSpeed;
    panLFO.connect(panner.pan);
    panLFO.start();
    activeNodes.push(panLFO);
  }
  panner.connect(sceneMix);
  activeNodes.push(panner);

  // --- PROCEDURAL GENERATION: Math over Hardcoding ---
  const validProgression = progression && progression.length ? progression : [1, 4, 6, 5];
  const scaleFreqs = generateScale(musicalKey, scaleType);
  
  // 1. Ambient Evolving Drone (replaces static drone)
  playDrone(audioCtx, panner, scaleFreqs[0] / 2); // Root note, lowered octave

  // 2. Procedural Chords Sequence
  // Play a new chord at the start of every bar (4 beats)
  let barStep = 0;
  const chordInterval = setInterval(() => {
    if (audioCtx.state === 'closed') return clearInterval(chordInterval);
    const degree = validProgression[barStep % validProgression.length];
    const freqs = buildChord(scaleFreqs, degree);
    const duration = beatDuration * 4; // Chord rings out for a full bar
    playProceduralChord(audioCtx, panner, freqs, audioCtx.currentTime, duration, bpm < 70); 
    barStep++;
  }, beatDuration * 4000); // Wait 4 beats in ms
  activeIntervals.push(chordInterval);

  // 3. Euclidean Arpeggiator Plucks
  let arpStep = 0;
  const arpInterval = setInterval(() => {
    if (audioCtx.state === 'closed') return clearInterval(arpInterval);
    
    // Play sporadically (Euclidean approximation)
    if (Math.random() > 0.4) {
      // Pick a random note from the chord currently playing
      const currentDegree = validProgression[barStep % validProgression.length];
      const freqs = buildChord(scaleFreqs, currentDegree);
      
      // Select a random note from the chord and bump it up an octave
      const arpFreq = freqs[Math.floor(Math.random() * freqs.length)] * 2;
      playArpNote(audioCtx, delays, panner, arpFreq, audioCtx.currentTime);
    }
    arpStep++;
  }, beatDuration * 500); // 8th notes (half a beat)
  activeIntervals.push(arpInterval);


  // --- Therapeutic Binaural Beats (Layered underneath) ---
  const oscL = audioCtx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.value = baseFrequency;
  
  const oscR = audioCtx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.value = baseFrequency + binauralHz;

  const merger = audioCtx.createChannelMerger(2);
  oscL.connect(merger, 0, 0);
  oscR.connect(merger, 0, 1);

  const binauralVolume = audioCtx.createGain();
  binauralVolume.gain.setValueAtTime(0, now);
  binauralVolume.gain.linearRampToValueAtTime(binauralGain, now + 10); 
  
  merger.connect(binauralVolume);
  // Binaural beats bypass reverb for absolute clarity and strict stereo separation
  binauralVolume.connect(mainOut);

  oscL.start();
  oscR.start();
  activeNodes.push(oscL, oscR, merger, binauralVolume);
}

export function fadeOutAudio() {
  if (!audioCtx) return;
  
  const now = audioCtx.currentTime;
  activeNodes.forEach(node => {
    if (node instanceof GainNode) {
      try {
        const current = node.gain.value;
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(current, now);
        node.gain.linearRampToValueAtTime(0, now + 3);
      } catch (e) {}
    }
  });
  
  fadeOutTimer = setTimeout(() => {
    stopAudio();
  }, 3500);
}
