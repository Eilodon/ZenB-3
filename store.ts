
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BREATHING_PATTERNS, BreathPattern, BreathPhase, BreathingType, ColorTheme, QualityTier, UserSettings, Language, SoundPack, SessionHistoryItem } from './types';

type SessionStats = {
  durationSec: number;
  cyclesCompleted: number;
  patternLabel: string;
  patternId: BreathingType;
};

type BreathState = {
  // Session State (Ephemeral)
  isActive: boolean;
  isPaused: boolean;
  currentPattern: BreathPattern;
  phase: BreathPhase;
  cycleCount: number;
  sessionStartTime: number;
  
  // UI State (Ephemeral)
  showSummary: boolean;
  lastSessionStats: SessionStats | null;

  // Persisted Settings
  hasSeenOnboarding: boolean;
  userSettings: UserSettings;
  history: SessionHistoryItem[];

  // Actions
  startSession: (type: BreathingType) => void;
  stopSession: () => void;
  finishSession: () => void;
  togglePause: () => void;
  setPhase: (phase: BreathPhase) => void;
  incrementCycle: () => void;
  completeOnboarding: () => void;
  closeSummary: () => void;
  clearHistory: () => void;

  // Settings Actions
  toggleSound: () => void;
  toggleHaptic: () => void;
  setHapticStrength: (s: UserSettings['hapticStrength']) => void;
  setTheme: (t: ColorTheme) => void;
  setQuality: (q: QualityTier) => void;
  setReduceMotion: (v: boolean) => void;
  toggleTimer: () => void;
  setLanguage: (l: Language) => void;
  setSoundPack: (p: SoundPack) => void;
};

// Helper to get local date string YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const useBreathStore = create<BreathState>()(
  persist(
    (set, get) => ({
      isActive: false,
      isPaused: false,
      currentPattern: BREATHING_PATTERNS['4-7-8'],
      phase: 'inhale',
      cycleCount: 0,
      sessionStartTime: 0,
      showSummary: false,
      lastSessionStats: null,
      
      hasSeenOnboarding: false,
      history: [],
      userSettings: {
        soundEnabled: true,
        hapticEnabled: true,
        hapticStrength: 'medium',
        theme: 'neutral',
        quality: 'auto',
        reduceMotion: false,
        showTimer: true,
        language: 'en',
        soundPack: 'musical',
        streak: 0,
        lastBreathDate: '',
      },

      startSession: (type) =>
        set({
          isActive: true,
          isPaused: false,
          currentPattern: BREATHING_PATTERNS[type],
          phase: 'inhale',
          cycleCount: 0,
          sessionStartTime: Date.now(),
          showSummary: false,
        }),

      stopSession: () => set({ isActive: false, isPaused: false, cycleCount: 0, phase: 'inhale', sessionStartTime: 0 }),
      
      finishSession: () => {
        const state = get();
        const durationSec = Math.floor((Date.now() - state.sessionStartTime) / 1000);
        
        // 1. Handle History
        let newHistory = state.history;
        if (durationSec > 10) {
            const newItem: SessionHistoryItem = {
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                timestamp: Date.now(),
                durationSec,
                patternId: state.currentPattern.id,
                cycles: state.cycleCount
            };
            newHistory = [newItem, ...state.history].slice(0, 100);
        }

        // 2. Handle Streak Logic (Only if session > 30s to prevent cheating)
        let newStreak = state.userSettings.streak;
        let newLastDate = state.userSettings.lastBreathDate;
        
        if (durationSec > 30) {
            const today = getTodayString();
            const yesterday = getYesterdayString();
            
            if (newLastDate === today) {
                // Already breathed today, keep streak
            } else if (newLastDate === yesterday) {
                // Breathed yesterday, increment!
                newStreak += 1;
                newLastDate = today;
            } else {
                // Missed a day (or first time), reset to 1
                newStreak = 1;
                newLastDate = today;
            }
        }

        set({
          isActive: false,
          isPaused: false,
          sessionStartTime: 0,
          showSummary: true,
          history: newHistory,
          userSettings: {
              ...state.userSettings,
              streak: newStreak,
              lastBreathDate: newLastDate
          },
          lastSessionStats: {
            durationSec,
            cyclesCompleted: state.cycleCount,
            patternLabel: state.currentPattern.label,
            patternId: state.currentPattern.id
          }
        });
      },

      togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
      
      setPhase: (phase) => set({ phase }),
      
      incrementCycle: () => set((s) => ({ cycleCount: s.cycleCount + 1 })),

      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      
      closeSummary: () => set({ showSummary: false }),
      
      clearHistory: () => set({ history: [] }),

      toggleSound: () =>
        set((s) => ({ userSettings: { ...s.userSettings, soundEnabled: !s.userSettings.soundEnabled } })),
      
      toggleHaptic: () =>
        set((s) => ({ userSettings: { ...s.userSettings, hapticEnabled: !s.userSettings.hapticEnabled } })),
      
      setHapticStrength: (hapticStrength) =>
        set((s) => ({ userSettings: { ...s.userSettings, hapticStrength } })),
      
      setTheme: (theme) => set((s) => ({ userSettings: { ...s.userSettings, theme } })),
      
      setQuality: (quality) => set((s) => ({ userSettings: { ...s.userSettings, quality } })),
      
      setReduceMotion: (reduceMotion) =>
        set((s) => ({ userSettings: { ...s.userSettings, reduceMotion } })),

      toggleTimer: () =>
        set((s) => ({ userSettings: { ...s.userSettings, showTimer: !s.userSettings.showTimer } })),

      setLanguage: (language) =>
        set((s) => ({ userSettings: { ...s.userSettings, language } })),

      setSoundPack: (soundPack) =>
        set((s) => ({ userSettings: { ...s.userSettings, soundPack } })),
    }),
    {
      name: 'zenb-storage',
      partialize: (state) => ({ 
        userSettings: state.userSettings, 
        hasSeenOnboarding: state.hasSeenOnboarding,
        history: state.history
      }),
    }
  )
);
