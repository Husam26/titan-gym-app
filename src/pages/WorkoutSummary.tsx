import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Clock, Dumbbell, TrendingUp, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { generateWorkoutSummary } from '../services/ai';
import type { ExerciseLog } from '../store/useStore';

interface WorkoutSummaryProps {
  exercises: ExerciseLog[];
  dayLabel: string;
  duration: number;
  onDone: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({
  exercises,
  dayLabel,
  duration,
  onDone,
}) => {
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  // ── Derived stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;

    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        totalVolume += set.weight * set.reps;
        totalSets++;
      }
    }

    return {
      totalVolume,
      totalSets,
      totalExercises: exercises.length,
    };
  }, [exercises]);

  // ── AI review on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const review = await generateWorkoutSummary(exercises, dayLabel, duration);
        if (!cancelled) setAiReview(review);
      } catch {
        if (!cancelled) setAiReview('Unable to generate review. Great workout though! 💪');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exercises, dayLabel, duration]);

  // ── Helpers ──────────────────────────────────────────────────────────
  function formatDuration(mins: number): string {
    if (mins < 60) return `${mins}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatVolume(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
    return kg.toLocaleString();
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-bg">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* ── Hero header ─────────────────────────────────────── */}
        <div className="pt-12 pb-6 px-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Workout Complete!</h1>
          <p className="text-sm text-zinc-500">
            {dayLabel} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* ── Stats grid ──────────────────────────────────────── */}
        <div className="px-4 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="grid grid-cols-3 gap-3">
            {/* Duration */}
            <div className="glass rounded-2xl p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white leading-tight">{formatDuration(duration)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">mins</p>
            </div>

            {/* Total Sets */}
            <div className="glass rounded-2xl p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white leading-tight">{stats.totalSets}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">sets</p>
            </div>

            {/* Total Volume */}
            <div className="glass rounded-2xl p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Dumbbell className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white leading-tight">{formatVolume(stats.totalVolume)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">kg vol.</p>
            </div>
          </div>
        </div>

        {/* ── Exercise breakdown ──────────────────────────────── */}
        <div className="px-4 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
            Exercises
          </h2>
          <div className="space-y-2">
            {exercises.map((exercise, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl px-4 py-3.5"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-400">{idx + 1}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{exercise.name}</h3>
                  </div>
                  <span className="text-xs text-zinc-500">{exercise.sets.length} sets</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {exercise.sets.map((set, setIdx) => (
                    <span
                      key={setIdx}
                      className="px-2.5 py-1 rounded-lg bg-bg text-xs text-zinc-300 border border-white/5"
                    >
                      {set.weight}kg × {set.reps}
                      {set.rpe ? (
                        <span className="text-zinc-500 ml-1">@{set.rpe}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Review ───────────────────────────────────────── */}
        <div className="px-4 mb-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            AI Review
          </h2>
          <div className="glass rounded-2xl p-4">
            {aiLoading ? (
              <div className="flex items-center gap-3 py-4 justify-center">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-sm text-zinc-400">Analyzing your workout...</span>
              </div>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {aiReview}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed bottom button ───────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent pt-8">
        <button
          onClick={onDone}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          Done
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
