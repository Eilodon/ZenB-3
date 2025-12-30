
import * as Tone from 'tone';
import { SoundPack, CueType, Language } from '../types';
import { TRANSLATIONS } from '../translations';

// -- AUDIO GRAPH STATE --
let isUnlocked = false;

/**
 * MASTER BUS & FX
 */
let masterGain: Tone.Gain | null = null;
let masterReverb: Tone.Reverb | null = null;
let stereoWidener: Tone.StereoWidener | null = null;

/**
 * INSTRUMENTS - LAYERED FOR REALISM
 */
// 1. PAD (Ambient)
let padSynth: Tone.PolySynth | null = null;
let padChorus: Tone.Chorus | null = null;

// 2. BELL (Tibetan Bowl Simulation)
// Real bowls have a "Fundamental" (Hum) and a "Partial" (Clang/Rim)
let bellFundamental: Tone.PolySynth | null = null; // The warm "Om" sound
let bellHarmonic: Tone.MetalSynth | null = null;   // The metallic strike
let bellVibrato: Tone.Tremolo | null = null;       // The "wah-wah" beating effect

// 3. BREATH (Organic Wind)
let breathInSynth: Tone.NoiseSynth | null = null;  // Brown noise (Deep, chest)
let breathOutSynth: Tone.NoiseSynth | null = null; // Pink noise (Mouth, air)
let breathFilter: Tone.Filter | null = null;

const CHORDS = {
  warm: ['C3', 'G3', 'B3', 'E4'], 
  neutral: ['D3', 'A3', 'C4', 'F4'],
  cool: ['A2', 'E3', 'B3', 'C#4'] // Lydian mysterious
};

/**
 * Robust TTS Helper with Fallback
 */
const speak = (text: string, lang: Language) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
  utterance.rate = 0.8; // Slow down for mindfulness
  utterance.pitch = lang === 'vi' ? 0.9 : 1.0; // Slightly lower for gravitas
  utterance.volume = 0.7;

  const voices = window.speechSynthesis.getVoices();
  // Prioritize "Enhanced", "Premium" or "Google" voices
  const preferredVoice = voices.find(v => 
    v.lang.includes(lang === 'vi' ? 'vi' : 'en') && 
    (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced'))
  );
  if (preferredVoice) utterance.voice = preferredVoice;

  window.speechSynthesis.speak(utterance);
};

/**
 * DIRECT UNLOCK: Call this immediately on User Interaction (click/touch).
 */
export const unlockAudio = async () => {
  if (isUnlocked) return true;

  try {
    await Tone.start();
    
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    if (!masterGain) {
      await setupInstruments();
    }

    // Warm up TTS
    if (window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); 
    }

    console.log("ZenB Audio Engine: 90% Realism Mode Activated");
    isUnlocked = true;
    return true;
  } catch (e) {
    console.error("Audio Unlock Failed:", e);
    return false;
  }
};

async function setupInstruments() {
  // 1. MASTER CHAIN
  // Compressing lightly to glue sounds together
  const limiter = new Tone.Limiter(-2).toDestination();
  masterGain = new Tone.Gain(0.85).connect(limiter);
  
  // 2. SPATIALIZATION
  stereoWidener = new Tone.StereoWidener(0.7).connect(masterGain); // Wide stereo image

  // 3. REVERB (The "Temple" Space)
  // High decay, high pre-delay to simulate a large hall
  masterReverb = new Tone.Reverb({ 
    decay: 8.5, 
    preDelay: 0.25, 
    wet: 0.45 
  });
  await masterReverb.generate();
  masterReverb.connect(stereoWidener);

  // --- INSTRUMENT 1: ORGANIC PAD ---
  padChorus = new Tone.Chorus(2.5, 4.5, 0.4).connect(masterReverb).start(); // Add drift
  padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
    envelope: { attack: 2, decay: 3, sustain: 0.6, release: 4 }
  }).connect(padChorus);
  padSynth.volume.value = -14;

  // --- INSTRUMENT 2: HYPER-REAL BELL (Tibetan Bowl) ---
  // Layer A: The "Soul" (Sine wave base)
  bellVibrato = new Tone.Tremolo(4, 0.6).connect(masterReverb).start(); // 4Hz beating frequency
  bellFundamental = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.1, decay: 4, sustain: 0.1, release: 6 } // Long tail
  }).connect(bellVibrato);
  bellFundamental.volume.value = -6;

  // Layer B: The "Body" (Metallic harmonics)
  bellHarmonic = new Tone.MetalSynth({
    frequency: 200,
    envelope: { attack: 0.01, decay: 1.5, release: 3 },
    harmonicity: 3.5, // Non-integer for bell sound
    modulationIndex: 12,
    resonance: 3000,
    octaves: 1
  }).connect(masterReverb);
  bellHarmonic.volume.value = -18; // Subtler, just for texture

  // --- INSTRUMENT 3: ORGANIC BREATH ---
  // Create a filter that moves
  breathFilter = new Tone.Filter(400, "lowpass", -12).connect(stereoWidener);
  
  // Inhale: Brown Noise (Deep, Lung filling)
  breathInSynth = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1.5 }
  }).connect(breathFilter);
  breathInSynth.volume.value = -12;

  // Exhale: Pink Noise (Air escaping, higher freq)
  breathOutSynth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1.5 }
  }).connect(breathFilter);
  breathOutSynth.volume.value = -16;
  
  console.log("ZenB Instruments: Harmonized");
}

export async function playCue(
  cue: CueType,
  enabled: boolean,
  pack: SoundPack,
  duration: number,
  lang: Language = 'en'
): Promise<void> {
  if (!enabled) return;

  if (Tone.context.state !== 'running') {
    Tone.context.resume().catch(() => {});
  }
  
  if (!masterGain) {
     setupInstruments().catch(console.error);
     return;
  }

  const time = Tone.now();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  try {
    // --- 1. MUSICAL PACK (Evolving Ambient) ---
    if (pack === 'musical') {
      if (cue === 'inhale') {
        padSynth?.triggerAttackRelease(CHORDS.warm, duration + 1, time);
      } else if (cue === 'exhale') {
        padSynth?.triggerAttackRelease(CHORDS.neutral, duration + 1, time);
      } else if (cue === 'hold') {
        // Subtle plucked harmonic for hold
        bellFundamental?.triggerAttackRelease(["E5"], 0.5, time);
      }
    } 
    
    // --- 2. BELLS PACK (Tibetan Bowl Physics) ---
    else if (pack === 'bells') {
      if (cue === 'inhale') {
        // Strike the bowl
        // Low Fundamental + High Harmonic strike
        const freq = 180; // F3 approx
        bellFundamental?.triggerAttackRelease(freq, duration + 2, time);
        bellHarmonic?.triggerAttackRelease(freq * 3.5, 0.5, time); // Strike ringing
        
        // Slow down vibrato for calm inhale
        if(bellVibrato) bellVibrato.frequency.rampTo(3, 1, time);
      } 
      else if (cue === 'exhale') {
        // Strike a related harmonic interval (Perfect 5th lower)
        const freq = 120; // ~B2
        bellFundamental?.triggerAttackRelease(freq, duration + 2, time);
        bellHarmonic?.triggerAttackRelease(freq * 3.5, 0.5, time);
        
        // Speed up vibrato slightly for release energy
        if(bellVibrato) bellVibrato.frequency.rampTo(4.5, 1, time);
      } 
      else if (cue === 'hold') {
        // "Ting" sound - High pitched, pure
        bellHarmonic?.triggerAttackRelease(800, 1.5, time);
      }
    }
    
    // --- 3. BREATH PACK (Bio-Simulation) ---
    else if (pack === 'breath') {
      if (cue === 'inhale') {
        // Open the filter (Lungs expanding) - 200Hz -> 1000Hz
        breathFilter?.frequency.cancelScheduledValues(time);
        breathFilter?.frequency.setValueAtTime(200, time);
        breathFilter?.frequency.exponentialRampTo(1000, duration * 0.9, time);
        
        // Trigger Deep Noise
        breathInSynth?.triggerAttackRelease(duration, time);
      } else if (cue === 'exhale') {
        // Close the filter (Lungs emptying) - 800Hz -> 100Hz
        breathFilter?.frequency.cancelScheduledValues(time);
        breathFilter?.frequency.setValueAtTime(800, time);
        breathFilter?.frequency.exponentialRampTo(150, duration * 0.9, time);
        
        // Trigger Air Noise
        breathOutSynth?.triggerAttackRelease(duration, time);
      }
    }
    
    // --- 4. VOICE PACKS ---
    else if (pack.startsWith('voice')) {
       let text = "";
       if (pack === 'voice-12') {
         if (cue === 'inhale') text = lang === 'vi' ? "Một" : "One";
         if (cue === 'exhale') text = lang === 'vi' ? "Hai" : "Two";
       } else {
         if (cue === 'inhale') text = t.phases.inhale;
         if (cue === 'exhale') text = t.phases.exhale;
         if (cue === 'hold') text = t.phases.hold;
       }

       if (text) {
         // Slight ducking of music could happen here, but simplest is just speak
         speak(text.toLowerCase(), lang);
       }
    }
  } catch (e) {
    console.warn("Play error:", e);
  }
}

export function cleanupAudio() {
  if (padSynth) padSynth.releaseAll();
  if (bellFundamental) bellFundamental.releaseAll();
  
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
