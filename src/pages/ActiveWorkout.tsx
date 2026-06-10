import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getSwapSuggestion } from '../services/ai';
import { Timer, Check, ArrowRightLeft, Loader2, ChevronRight, Minimize2, Undo2, Pencil, X } from 'lucide-react';

export const ActiveWorkout: React.FC<{ onComplete: () => void; onMinimize?: () => void }> = ({ onComplete, onMinimize }) => {
  const activeWorkout = useStore((s) => s.activeWorkout);
  const logSet = useStore((s) => s.logSet);
  const updateSet = useStore((s) => s.updateSet);
  const removeLastSet = useStore((s) => s.removeLastSet);
  const swapExercise = useStore((s) => s.swapExercise);
  const completeWorkout = useStore((s) => s.completeWorkout);
  const cancelWorkout = useStore((s) => s.cancelWorkout);

  const [activeExIdx, setActiveExIdx] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [editingSetIdx, setEditingSetIdx] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRpe, setEditRpe] = useState('');

  const tabsRef = useRef<HTMLDivElement>(null);

  // Elapsed timer
  useEffect(() => {
    if (!activeWorkout) return;
    const startTime = new Date(activeWorkout.startedAt).getTime();

    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Rest timer countdown (Absolute time for background support)
  useEffect(() => {
    if (!restEndTime) {
      setRestTimer(0);
      return;
    }

    const tick = () => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestTimer(0);
        setRestEndTime(null);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("Time's Up!", { body: "Rest over. Get back to work! 💪", icon: '/pwa-192x192.png' });
        }
      } else {
        setRestTimer(remaining);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    
    const handleVisibility = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [restEndTime]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  if (!activeWorkout) return null;

  const exercises = activeWorkout.exercises;
  const currentEx = exercises[activeExIdx];

  const totalSetsLogged = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  const handleLogSet = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    const rp = parseInt(rpe, 10);
    if (isNaN(w) || isNaN(r) || isNaN(rp) || w <= 0 || r <= 0 || rp < 1 || rp > 10) return;

    logSet(activeExIdx, { weight: w, reps: r, rpe: rp });
    setWeight('');
    setReps('');
    setRpe('');
    setRestEndTime(Date.now() + 90000); // start 90s rest timer
  };

  const handleSwap = async () => {
    if (!currentEx) return;
    setIsSwapping(true);
    try {
      const newName = await getSwapSuggestion(currentEx.name, activeWorkout.dayLabel);
      swapExercise(activeExIdx, newName);
    } catch (err) {
      console.error('Swap failed:', err);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleUndoSet = () => {
    if (currentEx && currentEx.sets.length > 0) {
      removeLastSet(activeExIdx);
    }
  };

  const handleStartEdit = (setIdx: number) => {
    const set = currentEx.sets[setIdx];
    setEditingSetIdx(setIdx);
    setEditWeight(String(set.weight));
    setEditReps(String(set.reps));
    setEditRpe(String(set.rpe || ''));
  };

  const handleSaveEdit = () => {
    if (editingSetIdx === null) return;
    const w = parseFloat(editWeight);
    const r = parseInt(editReps, 10);
    const rp = parseInt(editRpe, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
    updateSet(activeExIdx, editingSetIdx, { weight: w, reps: r, rpe: isNaN(rp) ? undefined : rp });
    setEditingSetIdx(null);
  };

  const handleComplete = () => {
    completeWorkout();
    onComplete();
  };

  const handleCancel = () => {
    cancelWorkout();
    onComplete();
  };

  // Rest timer progress (0 to 1)
  const REST_DURATION = 90;
  const restProgress = restTimer > 0 ? restTimer / REST_DURATION : 0;
  const circumference = 2 * Math.PI * 44; // radius 44

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h1 className="text-lg font-bold text-white">{activeWorkout.dayLabel} Day</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-mono font-medium">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="px-3 py-2 text-sm text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors"
              title="Minimize workout"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg font-medium transition-colors"
          >
            End
          </button>
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 animate-fade-in">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold text-lg mb-2">End workout?</h3>
            <p className="text-white/50 text-sm mb-5">
              {totalSetsLogged > 0
                ? `You've logged ${totalSetsLogged} set${totalSetsLogged > 1 ? 's' : ''}. Save and finish?`
                : 'No sets logged yet. Are you sure you want to cancel?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-xl transition-colors"
              >
                Continue
              </button>
              {totalSetsLogged > 0 ? (
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
                >
                  Save & End
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-xl transition-colors"
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise tabs */}
      <div
        ref={tabsRef}
        className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {exercises.map((ex, idx) => {
          const isActive = idx === activeExIdx;
          const hasSets = ex.sets.length > 0;
          return (
            <button
              key={`tab-${idx}`}
              onClick={() => setActiveExIdx(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-white'
                  : hasSets
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              {ex.name.length > 16 ? `${ex.name.slice(0, 16)}…` : ex.name}
              {hasSets && !isActive && (
                <span className="ml-1.5 text-xs opacity-70">({ex.sets.length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active exercise section */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {currentEx && (
          <div className="animate-fade-in">
            {/* Exercise header */}
            <div className="flex items-start justify-between mt-2 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{currentEx.name}</h2>
                <p className="text-white/40 text-sm mt-1">
                  {currentEx.targetSets} × {currentEx.targetReps} reps
                </p>
                {currentEx.lastWeight !== null && (
                  <p className="text-white/30 text-xs mt-1">
                    Last time: {currentEx.lastWeight}kg
                  </p>
                )}
              </div>
              <button
                onClick={handleSwap}
                disabled={isSwapping}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSwapping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Swap
              </button>
            </div>

            {/* Completed sets */}
            {currentEx.sets.length > 0 && (
              <div className="mb-4">
                <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-2">
                  Completed Sets
                </p>
                <div className="flex flex-col gap-2">
                  {currentEx.sets.map((set, setIdx) => (
                    <div
                      key={`set-${setIdx}`}
                      className="flex items-center gap-3 glass rounded-xl px-4 py-3 animate-slide-up"
                      style={{ animationDelay: `${setIdx * 40}ms` }}
                    >
                      {editingSetIdx === setIdx ? (
                        /* Inline edit mode */
                        <div className="flex-1 flex items-center gap-2">
                          <input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)} className="w-16 bg-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center" />
                          <span className="text-white/30 text-xs">kg ×</span>
                          <input type="number" value={editReps} onChange={e => setEditReps(e.target.value)} className="w-14 bg-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center" />
                          <span className="text-white/30 text-xs">@</span>
                          <input type="number" value={editRpe} onChange={e => setEditRpe(e.target.value)} className="w-12 bg-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center" placeholder="RPE" />
                          <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-500/20 rounded-lg"><Check className="w-4 h-4 text-emerald-400" /></button>
                          <button onClick={() => setEditingSetIdx(null)} className="p-1.5 bg-red-500/20 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                        </div>
                      ) : (
                        /* Display mode */
                        <>
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-white font-semibold">{set.weight}kg</span>
                            <span className="text-white/30 mx-2">×</span>
                            <span className="text-white font-semibold">{set.reps} reps</span>
                            {set.rpe && <span className="text-white/50 text-sm ml-2">@RPE {set.rpe}</span>}
                          </div>
                          <button onClick={() => handleStartEdit(setIdx)} className="p-1.5 text-white/20 hover:text-white/50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-white/20 text-sm font-medium">
                            Set {setIdx + 1}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Undo last set button */}
                  {currentEx.sets.length > 0 && (
                    <button
                      onClick={handleUndoSet}
                      className="flex items-center justify-center gap-1.5 text-sm text-red-400/60 hover:text-red-400 py-2 transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Undo last set
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rest timer */}
            {restTimer > 0 && (
              <div className="glass rounded-2xl p-5 mb-4 flex items-center gap-5 animate-fade-in">
                <div className="relative w-[100px] h-[100px] flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke="#10B981"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - restProgress)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold font-mono text-white">
                      {formatTime(restTimer)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Rest</p>
                  <p className="text-white/40 text-sm mt-1">
                    Recover before your next set
                  </p>
                  <button
                    onClick={() => { setRestEndTime(null); setRestTimer(0); }}
                    className="mt-3 text-emerald-400 text-sm font-medium flex items-center gap-1 hover:text-emerald-300 transition-colors"
                  >
                    Skip rest <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input row */}
            <div className="glass rounded-2xl p-4">
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">
                Log Set {currentEx.sets.length + 1}
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-white/30 text-xs mb-1.5 block">Weight</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-4 text-white text-xl font-bold text-center focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-white/15"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/30 text-xs mb-1.5 block">Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-4 text-white text-xl font-bold text-center focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-white/15"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/30 text-xs mb-1.5 block flex items-center gap-1">
                    RPE
                    <span className="text-white/20 text-[9px]">(1-10)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    placeholder="8"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-4 text-white text-xl font-bold text-center focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-white/15"
                  />
                </div>
              </div>

              {/* RPE Guide */}
              <div className="mt-2 mb-3 grid grid-cols-5 gap-1 text-center">
                <div className="rounded-lg bg-emerald-500/10 px-1 py-1.5">
                  <p className="text-[10px] font-bold text-emerald-400">1-4</p>
                  <p className="text-[8px] text-white/30">Easy</p>
                </div>
                <div className="rounded-lg bg-yellow-500/10 px-1 py-1.5">
                  <p className="text-[10px] font-bold text-yellow-400">5-6</p>
                  <p className="text-[8px] text-white/30">Medium</p>
                </div>
                <div className="rounded-lg bg-orange-500/10 px-1 py-1.5">
                  <p className="text-[10px] font-bold text-orange-400">7-8</p>
                  <p className="text-[8px] text-white/30">Hard</p>
                </div>
                <div className="rounded-lg bg-red-500/10 px-1 py-1.5">
                  <p className="text-[10px] font-bold text-red-400">9</p>
                  <p className="text-[8px] text-white/30">1 left</p>
                </div>
                <div className="rounded-lg bg-red-700/15 px-1 py-1.5">
                  <p className="text-[10px] font-bold text-red-500">💀 10</p>
                  <p className="text-[8px] text-white/30">Max</p>
                </div>
              </div>

              <button
                onClick={handleLogSet}
                disabled={!weight || !reps || !rpe}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-white/5 disabled:text-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-lg transition-colors"
              >
                <Check className="w-5 h-5" />
                Log Set
              </button>
            </div>

            {/* Navigate exercises */}
            {activeExIdx < exercises.length - 1 && currentEx.sets.length >= currentEx.targetSets && (
              <button
                onClick={() => setActiveExIdx((i) => i + 1)}
                className="w-full mt-3 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10 animate-fade-in"
              >
                Next: {exercises[activeExIdx + 1].name}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom: Complete workout */}
      {totalSetsLogged > 0 && (
        <div className="px-5 pb-5 pt-2 safe-bottom animate-slide-up">
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
          >
            Complete Workout
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
