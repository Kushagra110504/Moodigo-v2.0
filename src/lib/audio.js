let audioCtx = null;
let activeNodes = [];
let fadeOutTimer = null;
let activeIntervals = []; // Array to track custom music intervals

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
  
  // Clear all musical loops
  activeIntervals.forEach(interval => clearInterval(interval));
  activeIntervals = [];
  
  activeNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  activeNodes = [];
}

// Generate an impulse response for the Convolver (Reverb)
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

/* =======================================================================
                  INSTRUMENT SYNTHESIS ENGINE
======================================================================= */

function playPianoNote(ctx, destination, freq, time, duration = 3) {
  const osc1 = ctx.createOscillator(); 
  const osc2 = ctx.createOscillator(); 
  osc1.type = 'triangle';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 2.01, time);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();
  const masterInstGain = ctx.createGain();
  masterInstGain.gain.value = 0.55; 

  gain1.gain.setValueAtTime(0, time);
  gain1.gain.linearRampToValueAtTime(1, time + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, time + duration);

  gain2.gain.setValueAtTime(0, time);
  gain2.gain.linearRampToValueAtTime(0.5, time + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

  filter.frequency.setValueAtTime(3000, time); 
  filter.frequency.exponentialRampToValueAtTime(600, time + duration);

  osc1.connect(gain1); gain1.connect(filter);
  osc2.connect(gain2); gain2.connect(filter);
  filter.connect(masterInstGain);
  masterInstGain.connect(destination);

  osc1.start(time); osc2.start(time);
  osc1.stop(time + duration); osc2.stop(time + duration);
  
  activeNodes.push(osc1, osc2, gain1, gain2, filter, masterInstGain);
}

function playLofiChord(ctx, destination, freqs, time, duration = 4) {
  const chordFilter = ctx.createBiquadFilter();
  chordFilter.type = 'lowpass';
  chordFilter.frequency.setValueAtTime(1500, time); 
  
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 5; 
  lfo.connect(lfoGain);
  lfo.start(time); lfo.stop(time + duration);

  const chordGain = ctx.createGain();
  chordGain.gain.setValueAtTime(0, time);
  chordGain.gain.linearRampToValueAtTime(0.25, time + 1); 
  chordGain.gain.setValueAtTime(0.25, time + duration - 1);
  chordGain.gain.linearRampToValueAtTime(0.0001, time + duration);

  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lfoGain.connect(osc.detune);

    const osc2 = ctx.createOscillator(); 
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 15;

    osc.connect(chordFilter);
    osc2.connect(chordFilter);
    osc.start(time); osc.stop(time + duration);
    osc2.start(time); osc2.stop(time + duration);
    
    activeNodes.push(osc, osc2);
  });

  chordFilter.connect(chordGain);
  chordGain.connect(destination);
  activeNodes.push(chordFilter, lfo, lfoGain, chordGain);
}

function playAcousticPluck(ctx, destination, freq, time) {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.5;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.6, time + 0.01); 
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

  filter.frequency.setValueAtTime(3000, time);
  filter.frequency.exponentialRampToValueAtTime(500, time + 0.5);

  osc.connect(gain); gain.connect(filter); filter.connect(destination);
  osc.start(time); osc.stop(time + 1.5);
  
  activeNodes.push(osc, filter, gain);
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
    emotionalTag = 'peaceful'
  } = neuroConfig;

  const now = audioCtx.currentTime;

  // --- Master output & Reverb ---
  const mainOut = audioCtx.createGain();
  mainOut.gain.setValueAtTime(0, now);
  mainOut.gain.linearRampToValueAtTime(masterGain, now + 5);
  mainOut.connect(audioCtx.destination);
  activeNodes.push(mainOut);

  // Setup Convolver for Reverb
  const convolver = audioCtx.createConvolver();
  convolver.buffer = createReverbBuffer(audioCtx, reverbAmount);
  
  // Dry/Wet Reverb Mix
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

  // --- Musical Generation logic based on emotionalTag ---
  const tag = (emotionalTag || '').toLowerCase();
  
  // 1. Sad / Deep / Reflective (Pianos)
  if (['melancholic', 'grief', 'lonely', 'tender'].includes(tag)) {
    const pianoNotes = [220.00, 261.63, 329.63, 440.00, 329.63, 261.63]; // A Minor arp
    let noteIdx = 0;
    const interval = setInterval(() => {
      if (audioCtx.state === 'closed') return clearInterval(interval);
      playPianoNote(audioCtx, panner, pianoNotes[noteIdx % pianoNotes.length], audioCtx.currentTime);
      noteIdx++;
    }, 2000);
    activeIntervals.push(interval);
  } 
  // 2. Chilled / Nostalgic (Lo-fi Chords + soft kick)
  else if (['nostalgic', 'peaceful'].includes(tag)) {
    const chords = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
    ];
    let beatStep = 0;
    const interval = setInterval(() => {
      if (audioCtx.state === 'closed') return clearInterval(interval);
      if (beatStep % 4 === 0) {
        playLofiChord(audioCtx, panner, chords[(beatStep / 4) % chords.length], audioCtx.currentTime, 3.5);
      }
      beatStep++;
    }, 1000);
    activeIntervals.push(interval);
  } 
  // 3. Bright / Acoustic (sunny plucks)
  else if (['joyful', 'proud', 'energetic', 'awestruck'].includes(tag)) {
    const pluckNotes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C Major Penta
    const interval = setInterval(() => {
      if (audioCtx.state === 'closed') return clearInterval(interval);
      const numNotes = Math.floor(Math.random() * 3) + 1;
      for(let i=0; i<numNotes; i++) {
        setTimeout(() => {
           const note = pluckNotes[Math.floor(Math.random() * pluckNotes.length)];
           playAcousticPluck(audioCtx, panner, note * (Math.random() > 0.8 ? 2 : 1), audioCtx.currentTime);
        }, i * 300);
      }
    }, 2500);
    activeIntervals.push(interval);
  } 
  // 4. Retro / Intense / Electric (16-bit Synth Arps)
  else {
    const arpNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00];
    let step = 0;
    const interval = setInterval(() => {
      if (audioCtx.state === 'closed') return clearInterval(interval);
      const osc = audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = arpNotes[step % arpNotes.length];

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 1500;
      const g = audioCtx.createGain();
      
      osc.connect(filter); filter.connect(g); g.connect(panner);
      
      const t = audioCtx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.start(t); osc.stop(t + 0.15);
      activeNodes.push(osc, filter, g);
      step++;
    }, 150);
    activeIntervals.push(interval);
  }

  // --- Therapeutic Binaural Beats ---
  // Left Ear Oscillator
  const oscL = audioCtx.createOscillator();
  oscL.type = 'sine';
  oscL.frequency.value = baseFrequency;
  
  // Right Ear Oscillator (creates the interference beat inside the brain)
  const oscR = audioCtx.createOscillator();
  oscR.type = 'sine';
  oscR.frequency.value = baseFrequency + binauralHz;

  const merger = audioCtx.createChannelMerger(2);
  
  // Hard pan using channel routing -> Merges oscL to left channel (0), oscR to right channel (1)
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
