
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useBreathStore } from './store';
import OrbBreathViz from './components/OrbBreathViz';
import { useBreathEngine } from './hooks/useBreathEngine';
import { cleanupAudio, unlockAudio } from './services/audio';
import { BREATHING_PATTERNS, BreathingType, SoundPack } from './types';
import { TRANSLATIONS } from './translations';
import { 
  Play, Pause, Square, Volume2, VolumeX, Smartphone, SmartphoneNfc, 
  Settings2, X, Clock, ArrowRight, Award, Check, RotateCcw, Globe, Music,
  History, Trash2, Flame
} from 'lucide-react';
import clsx from 'clsx';

// --- Visual Components ---

const ProgressRing = ({ size = 140, stroke = 1.5, circleRef }: { size?: number, stroke?: number, circleRef: React.RefObject<SVGCircleElement> }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div className="relative flex items-center justify-center transition-all duration-300" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 rotate-[-90deg]">
        <circle
          stroke="rgba(255,255,255,0.03)"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          ref={circleRef}
          stroke="white"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference} // Start empty
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-0 ease-linear" // Remove CSS transition for JS frame control
          style={{ opacity: 0.6 }}
        />
      </svg>
    </div>
  );
};

// --- Modals ---

const OnboardingModal = ({ onComplete, t }: { onComplete: () => void, t: typeof TRANSLATIONS['en'] }) => {
  const [step, setStep] = useState(0);

  const steps = [
    { title: t.ui.welcome, text: t.ui.welcomeDesc, icon: <Award size={32} className="text-white/80" /> },
    { title: t.ui.findRhythm, text: t.ui.findRhythmDesc, icon: <Clock size={32} className="text-white/80" /> },
    { title: t.ui.breatheLight, text: t.ui.breatheLightDesc, icon: <Play size={32} className="text-white/80" /> }
  ];

  const handleNext = () => {
    unlockAudio(); 
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="mb-10 p-8 rounded-full bg-white/[0.03] border border-white/5 shadow-2xl shadow-white/5 scale-100 transition-transform duration-500">{steps[step].icon}</div>
        <h2 className="text-3xl font-serif font-medium mb-4 tracking-wide text-white">{steps[step].title}</h2>
        <p className="text-white/60 mb-12 leading-relaxed max-w-[280px] font-sans font-light">{steps[step].text}</p>
        
        <div className="flex gap-2.5 mb-12">
          {steps.map((_, i) => (
            <div key={i} className={clsx("h-1 rounded-full transition-all duration-700", i === step ? "w-8 bg-white" : "w-1.5 bg-white/10")} />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full py-4 bg-white text-black font-sans font-medium text-base rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {step === steps.length - 1 ? t.ui.beginJourney : t.ui.continue} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const SummaryModal = ({ stats, onClose, t, streak }: { stats: any, onClose: () => void, t: typeof TRANSLATIONS['en'], streak: number }) => {
  const localizedLabel = TRANSLATIONS[t === TRANSLATIONS.vi ? 'vi' : 'en'].patterns[stats.patternId as BreathingType]?.label || stats.patternLabel;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-xl animate-in fade-in duration-700">
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <div className="mb-8 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] font-sans">{t.ui.sessionComplete}</div>
        <h2 className="text-5xl font-serif text-white text-center mb-3 tracking-tight">{localizedLabel}</h2>
        <p className="text-white/50 text-sm mb-12 text-center font-sans font-light max-w-xs leading-relaxed">{t.ui.mindClear}</p>
        
        <div className="grid grid-cols-2 gap-4 w-full mb-12">
          <div className="flex flex-col items-center p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <div className="text-3xl font-light mb-1 font-sans">
              {Math.floor(stats.durationSec / 60)}<span className="text-lg opacity-40">:</span>{(stats.durationSec % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-2">{t.ui.timeBreathed}</div>
          </div>
          <div className="flex flex-col items-center p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden">
             {/* Streak Shine Effect */}
             {streak > 1 && <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />}
            <div className={clsx("text-3xl font-light mb-1 font-sans flex items-center gap-2", streak > 1 ? "text-orange-200" : "text-white")}>
                {streak} <Flame size={20} className={streak > 1 ? "fill-orange-500 text-orange-500" : "text-white/20"} />
            </div>
            <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-2">{t.ui.streak}</div>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="group relative w-full py-4 bg-white text-black font-medium rounded-2xl overflow-hidden active:scale-95 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative flex items-center justify-center gap-2 font-sans"><RotateCcw size={16} /> {t.ui.finish}</span>
        </button>
      </div>
    </div>
  );
};

const formatDate = (timestamp: number, lang: 'en' | 'vi', t: any) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `${t.history.today}, ${timeStr}`;
  return date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
};

// --- Main App ---

export default function App() {
  const { 
    isActive, isPaused, phase, cycleCount, currentPattern, userSettings,
    hasSeenOnboarding, showSummary, lastSessionStats, history,
    startSession, finishSession, togglePause, completeOnboarding, closeSummary,
    toggleSound, toggleHaptic, setHapticStrength, setQuality, setReduceMotion, toggleTimer, setLanguage, setSoundPack,
    clearHistory
  } = useBreathStore();

  const { progressRef } = useBreathEngine();
  const [selectedPatternId, setSelectedPatternId] = useState<BreathingType>(currentPattern.id as BreathingType);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const textScaleRef = useRef<HTMLDivElement>(null);
  const ringCircleRef = useRef<SVGCircleElement>(null);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Translation hook
  const t = TRANSLATIONS[userSettings.language] || TRANSLATIONS.en;

  // GLOBAL AUDIO UNLOCKER
  useEffect(() => {
    const oneTimeUnlock = () => {
        unlockAudio();
    };
    window.addEventListener('click', oneTimeUnlock);
    window.addEventListener('touchstart', oneTimeUnlock);
    return () => {
        window.removeEventListener('click', oneTimeUnlock);
        window.removeEventListener('touchstart', oneTimeUnlock);
    };
  }, []);

  const historyStats = useMemo(() => {
    const totalSessions = history.length;
    const totalSecs = history.reduce((acc, curr) => acc + curr.durationSec, 0);
    const totalMins = Math.floor(totalSecs / 60);
    return { totalSessions, totalMins };
  }, [history]);

  useEffect(() => {
    if (!isActive) {
        if (textScaleRef.current) textScaleRef.current.style.transform = 'scale(1)';
        return;
    }

    let rId: number;
    const RING_SIZE = 180;
    const STROKE = 1.5;
    const RADIUS = (RING_SIZE - STROKE) / 2;
    const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

    const loop = () => {
      const p = progressRef.current;
      
      if (ringCircleRef.current) {
        const offset = CIRCUMFERENCE - p * CIRCUMFERENCE;
        ringCircleRef.current.style.strokeDashoffset = String(offset);
      }

      let scale = 1;
      if (phase === 'inhale') scale = 1 + (p * 0.1); 
      else if (phase === 'exhale') scale = 1.1 - (p * 0.1);
      else if (phase === 'holdIn') scale = 1.1;
      else if (phase === 'holdOut') scale = 1;
      
      if (textScaleRef.current) {
        textScaleRef.current.style.transform = `scale(${scale})`;
      }

      rId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rId);
  }, [isActive, phase, progressRef]);

  // Audio Cleanup
  useEffect(() => {
    if (!isActive) cleanupAudio();
  }, [isActive]);

  // WAKE LOCK
  useEffect(() => {
    const requestWakeLock = async () => {
      if (!isActive || isPaused) {
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = null;
        }
        return;
      }

      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          wakeLockRef.current = lock;
          lock.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } catch (err) {
          console.warn("Wake Lock failed:", err);
        }
      }
    };

    requestWakeLock();

    const handleVis = () => {
      if (document.visibilityState === 'visible' && isActive && !isPaused) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    unlockAudio();
    startSession(selectedPatternId);
  };

  const handleStop = () => {
    cleanupAudio();
    finishSession();
  };

  const phaseLabel = useMemo(() => {
    if (phase === 'holdIn' || phase === 'holdOut') return t.phases.hold;
    return t.phases[phase];
  }, [phase, t]);

  const soundPacks: SoundPack[] = ['musical', 'bells', 'breath', 'voice-en', 'voice-vi', 'voice-12'];

  return (
    <div className="relative w-full min-h-dvh overflow-hidden bg-[#050508] text-white selection:bg-white/20 font-sans">
      
      {/* ---------------- LAYER 0: VISUALIZER ---------------- */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <OrbBreathViz
          phase={phase}
          theme={isActive ? currentPattern.colorTheme : BREATHING_PATTERNS[selectedPatternId].colorTheme}
          quality={userSettings.quality}
          reduceMotion={userSettings.reduceMotion}
          progressRef={progressRef}
          isActive={isActive}
        />
      </div>

      {/* ---------------- LAYER 1: UI OVERLAYS ---------------- */}
      
      {/* 1.1 Header */}
      <header 
        className={clsx(
          "fixed top-0 inset-x-0 z-40 p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] flex justify-between items-start transition-all duration-700",
          isActive ? "opacity-0 pointer-events-none -translate-y-4" : "opacity-100 translate-y-0"
        )}
      >
        <div className="flex flex-col">
          <h1 className="text-2xl font-serif font-medium tracking-wide text-white">{t.ui.title}</h1>
          {userSettings.streak > 0 && (
             <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-left-2 duration-700 delay-300">
                <Flame size={10} className={clsx("transition-colors", userSettings.streak > 1 ? "fill-orange-400 text-orange-400" : "text-white/30")} />
                <span className="text-[10px] font-sans text-white/40 tracking-widest uppercase">{userSettings.streak} {t.ui.dayStreak}</span>
             </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-full border border-white/5 transition-all"
              aria-label="History"
          >
              <History size={20} className="text-white/80" strokeWidth={1.5} />
          </button>
          <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-full border border-white/5 transition-all"
              aria-label="Settings"
          >
              <Settings2 size={20} className="text-white/80" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Active Header (Minimal) */}
      <div className={clsx("fixed top-8 left-0 w-full flex justify-center z-40 transition-opacity duration-1000", isActive ? "opacity-100" : "opacity-0")}>
         {isActive && !isPaused && (
             <div className="text-[9px] font-sans uppercase tracking-[0.2em] text-white/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
                 {t.ui.focusMode}
             </div>
         )}
      </div>

      {/* 1.2 Center Info */}
      {isActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className={clsx("relative flex items-center justify-center transition-all duration-700", isPaused ? "opacity-30 blur-sm scale-95" : "opacity-100 scale-100")}>
            
            <div 
                ref={textScaleRef}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 will-change-transform"
            >
              <div className="text-3xl font-serif font-medium tracking-wider text-white mb-3 drop-shadow-2xl opacity-90">
                {phaseLabel}
              </div>
              {userSettings.showTimer && (
                <div className="text-[10px] font-sans text-white/40 uppercase tracking-[0.2em]">
                  {t.ui.cycle} {cycleCount + 1}
                </div>
              )}
            </div>

            {userSettings.showTimer && (
              <ProgressRing size={180} circleRef={ringCircleRef} />
            )}
          </div>

          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center z-30">
               <div className="px-8 py-4 rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-xs font-bold tracking-[0.2em] uppercase shadow-2xl animate-in fade-in zoom-in-95 font-sans">
                 {t.ui.paused}
               </div>
            </div>
          )}
        </div>
      )}

      {/* 1.3 Footer Controls */}
      <footer 
        className={clsx(
          "fixed bottom-0 inset-x-0 z-30 pb-[calc(2.5rem+env(safe-area-inset-bottom))] px-6 transition-all duration-700 ease-out",
        )}
      >
        <div className="max-w-md mx-auto w-full flex flex-col justify-end min-h-[160px]">
          
          {!isActive && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
               <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-6 ml-2">{t.ui.selectRhythm}</div>
               
               <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 touch-pan-x">
                  {Object.values(BREATHING_PATTERNS).map((p) => {
                    const localizedPattern = t.patterns[p.id as BreathingType];
                    const isSelected = selectedPatternId === p.id;
                    return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatternId(p.id as BreathingType)}
                      className={clsx(
                        "flex-shrink-0 w-[78vw] max-w-[300px] p-7 rounded-[2.5rem] text-left transition-all duration-500 snap-center relative overflow-hidden group",
                        isSelected 
                          ? "glass-card-active scale-100 opacity-100" 
                          : "border border-white/5 bg-white/[0.01] opacity-60 scale-95"
                      )}
                    >
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                              <span className={clsx("text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors", 
                                  isSelected ? "bg-white text-black" : "bg-white/10 text-white"
                              )}>
                                  {localizedPattern.tag}
                              </span>
                          </div>
                          <h3 className="text-3xl font-serif mb-3 tracking-wide text-white">{localizedPattern.label}</h3>
                          <p className="text-sm text-white/60 leading-relaxed mb-8 min-h-[3em] font-sans font-light">{localizedPattern.description}</p>
                          
                          <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 uppercase tracking-widest">
                              <div>{t.shortPhases.in} {p.timings.inhale}</div>
                              {p.timings.holdIn > 0 && <div className="w-0.5 h-0.5 rounded-full bg-white/30"/>}
                              {p.timings.holdIn > 0 && <div>{t.shortPhases.hold} {p.timings.holdIn}</div>}
                              <div className="w-0.5 h-0.5 rounded-full bg-white/30"/>
                              <div>{t.shortPhases.out} {p.timings.exhale}</div>
                          </div>
                      </div>
                    </button>
                  );
                  })}
                  <div className="w-4 flex-shrink-0"></div>
               </div>

               <button
                  onClick={handleStart}
                  className="mt-6 w-full py-5 bg-white text-black rounded-2xl font-medium text-lg hover:bg-gray-100 active:scale-[0.99] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 font-sans"
                >
                  <Play fill="currentColor" size={18} /> {t.ui.begin}
                </button>
            </div>
          )}

          {isActive && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
              <button
                onClick={togglePause}
                className="py-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:bg-white/[0.06] text-white rounded-2xl font-medium flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isPaused ? <Play size={20} fill="currentColor"/> : <Pause size={20} fill="currentColor" />}
                {isPaused ? t.ui.resume : t.ui.pause}
              </button>
              <button
                onClick={handleStop}
                className="py-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:bg-red-500/10 text-white/60 hover:text-red-200 rounded-2xl font-medium flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Square size={18} fill="currentColor" />
                {t.ui.end}
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* ---------------- OVERLAYS ---------------- */}
      
      {!hasSeenOnboarding && <OnboardingModal onComplete={completeOnboarding} t={t} />}
      {showSummary && lastSessionStats && <SummaryModal stats={lastSessionStats} onClose={closeSummary} t={t} streak={userSettings.streak} />}

      {/* History Sheet */}
      <div 
        className={clsx(
            "fixed inset-0 z-50 transition-colors duration-500 pointer-events-none",
            isHistoryOpen ? "bg-black/60 backdrop-blur-sm pointer-events-auto" : "bg-transparent"
        )}
        onClick={() => setIsHistoryOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className={clsx(
              "absolute inset-x-0 bottom-0 h-[85vh] bg-[#08080a] border-t border-white/10 rounded-t-[3rem] p-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1) shadow-2xl flex flex-col",
              isHistoryOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
           <div className="flex justify-between items-center mb-8 flex-shrink-0">
              <h3 className="text-2xl font-serif text-white tracking-wide flex items-center gap-3">{t.history.title}</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><X size={20} className="text-white/70"/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                      <div className="text-3xl font-light font-sans mb-1 text-white">{historyStats.totalMins}</div>
                      <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest">{t.history.totalMinutes}</div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                      {userSettings.streak > 1 && <div className="absolute inset-0 bg-orange-500/5" />}
                      <div className={clsx("text-3xl font-light font-sans mb-1 flex items-center gap-2", userSettings.streak > 1 ? "text-orange-200" : "text-white")}>
                          {userSettings.streak} <Flame size={20} className={userSettings.streak > 1 ? "text-orange-500 fill-orange-500" : "text-white/20"} />
                      </div>
                      <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest">{t.ui.streak}</div>
                  </div>
              </div>

              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <div className="mb-6 text-5xl grayscale">🍃</div>
                  <p className="text-sm font-light max-w-[200px]">{t.history.noHistory}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.05] rounded-3xl border border-white/5 transition-colors">
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-sm font-bold text-white/60 font-mono">
                              {item.cycles}
                           </div>
                           <div>
                              <div className="text-base font-serif text-white/90">
                                {t.patterns[item.patternId]?.label || 'Breath'}
                              </div>
                              <div className="text-[11px] text-white/40 font-mono mt-1 tracking-wide">
                                {formatDate(item.timestamp, userSettings.language, t)}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-sm font-medium text-white/90 font-mono">
                             {Math.floor(item.durationSec / 60)}<span className="text-[10px] text-white/30 ml-0.5">{t.history.min}</span> {item.durationSec % 60}<span className="text-[10px] text-white/30 ml-0.5">{t.history.sec}</span>
                           </div>
                        </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={clearHistory}
                    className="w-full mt-10 py-4 text-xs text-white/20 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <Trash2 size={12} /> {t.history.clear}
                  </button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <div 
        className={clsx(
            "fixed inset-0 z-50 transition-colors duration-500 pointer-events-none",
            isSettingsOpen ? "bg-black/60 backdrop-blur-sm pointer-events-auto" : "bg-transparent"
        )}
        onClick={() => setIsSettingsOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className={clsx(
              "absolute inset-x-0 bottom-0 bg-[#08080a] border-t border-white/10 rounded-t-[3rem] p-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))] transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1) shadow-2xl",
              isSettingsOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif text-white tracking-wide">{t.settings.header}</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><X size={20} className="text-white/70"/></button>
           </div>
           
           <div className="space-y-10 max-h-[70vh] overflow-y-auto scrollbar-hide pb-12">
              <section>
                  <div className="text-[9px] text-white/30 uppercase font-bold mb-4 tracking-[0.2em] flex items-center gap-2 pl-1">
                    {t.settings.language}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setLanguage('en')} 
                        className={clsx("p-4 rounded-2xl flex items-center justify-center gap-3 transition-all border", userSettings.language === 'en' ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/30")}
                      >
                         <span className="text-xl">🇬🇧</span>
                         <span className="text-xs font-medium tracking-wide">English</span>
                      </button>
                      <button 
                        onClick={() => setLanguage('vi')} 
                        className={clsx("p-4 rounded-2xl flex items-center justify-center gap-3 transition-all border", userSettings.language === 'vi' ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/30")}
                      >
                         <span className="text-xl">🇻🇳</span>
                         <span className="text-xs font-medium tracking-wide">Tiếng Việt</span>
                      </button>
                  </div>
              </section>

              <section>
                  <div className="text-[9px] text-white/30 uppercase font-bold mb-4 tracking-[0.2em] flex items-center gap-2 pl-1">
                    {t.settings.immersion}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={toggleSound} className={clsx("p-5 rounded-2xl flex flex-col items-center gap-3 transition-all border", userSettings.soundEnabled ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/30")}>
                            {userSettings.soundEnabled ? <Volume2 size={24} strokeWidth={1} /> : <VolumeX size={24} strokeWidth={1} />}
                            <span className="text-xs font-medium tracking-wide">{t.settings.sounds}</span>
                        </button>
                        <button onClick={toggleHaptic} className={clsx("p-5 rounded-2xl flex flex-col items-center gap-3 transition-all border", userSettings.hapticEnabled ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/30")}>
                            {userSettings.hapticEnabled ? <Smartphone size={24} strokeWidth={1} /> : <SmartphoneNfc size={24} strokeWidth={1} />}
                            <span className="text-xs font-medium tracking-wide">{t.settings.haptics}</span>
                        </button>
                    </div>

                    {userSettings.soundEnabled && (
                      <div className="bg-white/[0.03] rounded-3xl border border-white/5 p-5">
                        <div className="text-[9px] text-white/40 uppercase font-bold mb-4 tracking-wider flex items-center gap-2">
                           <Music size={12} /> {t.settings.soundPack}
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {soundPacks.map(pack => (
                            <button
                              key={pack}
                              onClick={() => setSoundPack(pack)}
                              className={clsx(
                                "w-full text-left px-4 py-3.5 rounded-xl text-xs font-medium tracking-wide transition-all flex items-center justify-between group",
                                userSettings.soundPack === pack 
                                  ? "bg-white text-black" 
                                  : "text-white/50 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {t.settings.soundPacks[pack]}
                              {userSettings.soundPack === pack && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {userSettings.hapticEnabled && (
                      <div className="flex bg-black/40 rounded-2xl p-1.5 border border-white/5">
                          {(['light', 'medium', 'heavy'] as const).map(s => (
                            <button key={s} onClick={() => setHapticStrength(s)} className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all", userSettings.hapticStrength === s ? "bg-white/20 text-white shadow-sm" : "text-white/30 hover:text-white/50")}>
                              {t.settings.hapticStrength[s]}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
              </section>

              <section>
                  <div className="text-[9px] text-white/30 uppercase font-bold mb-4 tracking-[0.2em] flex items-center gap-2 pl-1">
                    {t.settings.visuals}
                  </div>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                          <span className="text-sm font-light text-white/80">{t.settings.graphics}</span>
                          <select 
                            value={userSettings.quality} 
                            onChange={(e) => setQuality(e.target.value as any)}
                            className="bg-black/40 text-white text-xs py-2 px-4 rounded-lg border border-white/10 outline-none focus:border-white/30 appearance-none font-mono"
                          >
                              <option value="auto">{t.settings.quality.auto}</option>
                              <option value="low">{t.settings.quality.low}</option>
                              <option value="medium">{t.settings.quality.medium}</option>
                              <option value="high">{t.settings.quality.high}</option>
                          </select>
                      </div>
                      <label className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
                          <span className="text-sm font-light text-white/80">{t.settings.reduceMotion}</span>
                          <div className={clsx("w-11 h-6 rounded-full relative transition-colors border border-white/10", userSettings.reduceMotion ? "bg-white" : "bg-white/10")}>
                              <input type="checkbox" checked={userSettings.reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} className="sr-only"/>
                              <div className={clsx("absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform", userSettings.reduceMotion ? "bg-black translate-x-5" : "bg-white/50 translate-x-0")} />
                          </div>
                      </label>
                      <label className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
                          <span className="text-sm font-light text-white/80">{t.settings.showTimer}</span>
                          <div className={clsx("w-11 h-6 rounded-full relative transition-colors border border-white/10", userSettings.showTimer ? "bg-white" : "bg-white/10")}>
                              <input type="checkbox" checked={userSettings.showTimer} onChange={toggleTimer} className="sr-only"/>
                              <div className={clsx("absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform", userSettings.showTimer ? "bg-black translate-x-5" : "bg-white/50 translate-x-0")} />
                          </div>
                      </label>
                  </div>
              </section>
              
              <div className="pt-8 pb-4 flex justify-center opacity-20">
                <div className="w-12 h-1 rounded-full bg-white/30"></div>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}
