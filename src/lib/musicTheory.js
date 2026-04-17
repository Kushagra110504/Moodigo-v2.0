// src/lib/musicTheory.js

// Map of note names to their semitone distance from C
const NOTE_MAP = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 
  'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 
  'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
};

// Intervals for common scales (in semitones from root)
const SCALES = {
  'major':      [0, 2, 4, 5, 7, 9, 11],
  'minor':      [0, 2, 3, 5, 7, 8, 10],     // Aeolian
  'dorian':     [0, 2, 3, 5, 7, 9, 10],
  'phrygian':   [0, 1, 3, 5, 7, 8, 10],
  'lydian':     [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'aeolian':    [0, 2, 3, 5, 7, 8, 10]
};

/**
 * Get the base frequency (Hz) for a given note name at Octave 4.
 * A4 is standard 440Hz.
 */
function getRootHz(noteName) {
  const upperNote = (noteName || 'C').toUpperCase();
  let semitonesFromC = NOTE_MAP[upperNote];
  
  // Fallback to C if invalid note
  if (semitonesFromC === undefined) semitonesFromC = 0; 

  // Calculate distance from A4 (which is semitone 9 in NOTE_MAP, but at Octave 4)
  // C4 is 9 semitones below A4 (-9)
  const semitonesFromA4 = (semitonesFromC - 9); 
  
  // f = 440 * 2^(n/12)
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Generates an array of frequencies creating a 3-octave scale palette starting from octave 3.
 */
export function generateScale(rootNote, scaleType = 'major') {
  const scaleIntervals = SCALES[scaleType.toLowerCase()] || SCALES['major'];
  const rootHz4 = getRootHz(rootNote);
  const rootHz3 = rootHz4 / 2; // Start from 3rd octave for warmth

  const scaleFrequencies = [];

  // Generate 3 octaves worth of notes (21 notes)
  for (let octave = 0; octave < 3; octave++) {
    for (let i = 0; i < scaleIntervals.length; i++) {
        const interval = scaleIntervals[i];
        // Hz = BaseHz * 2^(distance/12)
        const hz = rootHz3 * Math.pow(2, octave); // Bump up octave
        const finalHz = hz * Math.pow(2, interval / 12);
        scaleFrequencies.push(finalHz);
    }
  }

  return scaleFrequencies;
}

/**
 * Builds a 4-note chord (Root, 3rd, 5th, 7th) from the generated scale based on the degree.
 * Degree is 1-indexed (e.g. 1 is the root chord, 5 is the dominant).
 */
export function buildChord(scaleFrequencies, degree) {
  // Convert 1-indexed degree to 0-indexed array position
  // Example: Degree 1 (Root) -> Index 0.
  // Add 7 to start the chords in the middle octave (octave 4 instead of 3) for clarity
  let rootIndex = (degree - 1) + 7; 
  
  // Safe bounds check
  if (rootIndex >= scaleFrequencies.length) rootIndex = rootIndex % 7 + 7; 
  
  // Select every alternate note in the scale [Root, 3rd, 5th, 7th]
  const note1 = scaleFrequencies[rootIndex % scaleFrequencies.length];
  const note2 = scaleFrequencies[(rootIndex + 2) % scaleFrequencies.length];
  const note3 = scaleFrequencies[(rootIndex + 4) % scaleFrequencies.length];
  const note4 = scaleFrequencies[(rootIndex + 6) % scaleFrequencies.length];
  
  return [note1, note2, note3, note4];
}
