import React from 'react';
import { useStore } from '../store/useStore';
import type { WorkoutSession, ExerciseLog } from '../store/useStore';
import { Dumbbell, Clock, ChevronDown, ChevronUp, TrendingUp, Calendar } from 'lucide-react';
import { useState } from 'react';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function getExerciseSummary(exercises: ExerciseLog[]): string {
  const names = exercises.map((e) => e.name);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')}...`;
}

/** Check if a specific exercise had a higher max weight in this session compared to the previous occurrence */
function hadWeightIncrease(
  exerciseName: string,
  currentSession: WorkoutSession,
  allSessions: WorkoutSession[]
): boolean {
  const currentMax = getMaxWeight(currentSession, exerciseName);
  if (currentMax === null) return false;

  // Find the previous session that contains this exercise (must be older)
  const currentIdx = allSessions.findIndex((s) => s.id === currentSession.id);
  for (let i = currentIdx + 1; i < allSessions.length; i++) {
    const prevMax = getMaxWeight(allSessions[i], exerciseName);
    if (prevMax !== null) {
      return currentMax > prevMax;
    }
  }
  return false;
}

function getMaxWeight(session: WorkoutSession, exerciseName: string): number | null {
  const exercise = session.exercises.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (!exercise || exercise.sets.length === 0) return null;
  return Math.max(...exercise.sets.map((s) => s.weight));
}

function getThisWeekCount(history: WorkoutSession[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return history.filter((s) => new Date(s.date) >= monday).length;
}

export const History: React.FC = () => {
  const workoutHistory = useStore((s) => s.workoutHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const thisWeek = getThisWeekCount(workoutHistory);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="px-4 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Workout History</h1>
          <span className="text-xs text-zinc-500">
            {workoutHistory.length} workout{workoutHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Stats bar */}
        {workoutHistory.length > 0 && (
          <div className="flex gap-3 animate-fade-in">
            <div className="flex-1 glass rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Total</span>
              </div>
              <p className="text-lg font-bold text-white">{workoutHistory.length}</p>
            </div>
            <div className="flex-1 glass rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">This Week</span>
              </div>
              <p className="text-lg font-bold text-white">{thisWeek}</p>
            </div>
          </div>
        )}
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {/* Empty state */}
        {workoutHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Dumbbell className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">No workouts yet</h2>
            <p className="text-sm text-zinc-500 max-w-[240px]">
              Complete your first workout and it'll show up here. Let's get started! 💪
            </p>
          </div>
        )}

        {/* Workout list */}
        <div className="space-y-3">
          {workoutHistory.map((session) => {
            const isExpanded = expandedId === session.id;

            return (
              <div
                key={session.id}
                className="glass rounded-2xl overflow-hidden animate-slide-up"
              >
                {/* Card header — tappable */}
                <button
                  onClick={() => toggleExpand(session.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 active:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {/* Date */}
                    <p className="text-xs text-zinc-500 mb-1">{formatDate(session.date)}</p>

                    {/* Day label + badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {session.dayLabel}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-medium flex-shrink-0">
                        {session.dayLabel}
                      </span>
                    </div>

                    {/* Duration + exercise summary */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {session.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(session.duration)}
                        </span>
                      )}
                      <span className="truncate">{getExerciseSummary(session.exercises)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 mt-1 text-zinc-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-fade-in">
                    {session.exercises.map((exercise, exIdx) => {
                      const increased = hadWeightIncrease(
                        exercise.name,
                        session,
                        workoutHistory
                      );

                      return (
                        <div key={exIdx}>
                          {/* Exercise name */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm font-medium text-white">{exercise.name}</p>
                            {increased && (
                              <span className="flex items-center gap-0.5 text-emerald-400" title="Weight increase">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">🔺</span>
                              </span>
                            )}
                          </div>

                          {/* Sets */}
                          <div className="flex flex-wrap gap-2">
                            {exercise.sets.map((set, setIdx) => (
                              <span
                                key={setIdx}
                                className="px-2.5 py-1 rounded-lg bg-bg-elevated text-xs text-zinc-300 border border-white/5"
                              >
                                {set.weight}kg × {set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
