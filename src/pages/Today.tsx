import React from 'react';
import { useStore, getTodayLabel } from '../store/useStore';
import { generateTodayWorkout, remixWorkout } from '../services/ai';
import { Dumbbell, RefreshCw, Sparkles, Loader2, BedDouble } from 'lucide-react';

export const Today: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const profile = useStore((s) => s.profile);
  const todayPlan = useStore((s) => s.todayPlan);
  const isGenerating = useStore((s) => s.isGenerating);
  const setTodayPlan = useStore((s) => s.setTodayPlan);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const startWorkout = useStore((s) => s.startWorkout);

  const todayLabel = getTodayLabel(profile.split);
  const isRestDay = todayLabel.toLowerCase() === 'rest';

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const plan = await generateTodayWorkout(todayLabel);
      setTodayPlan(plan);
    } catch (err) {
      console.error('Failed to generate workout:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemix = async () => {
    setIsGenerating(true);
    try {
      const plan = await remixWorkout(todayLabel);
      setTodayPlan(plan);
    } catch (err) {
      console.error('Failed to remix workout:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartWorkout = () => {
    if (!todayPlan) return;
    startWorkout(
      todayPlan.dayLabel,
      todayPlan.exercises.map((ex) => ({
        name: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        lastWeight: ex.lastWeight,
      }))
    );
    onNavigate('active-workout');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 animate-fade-in">
        <p className="text-2xl font-bold text-white">
          Hey {profile.name || 'there'} 👋
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-emerald-400 font-semibold text-sm">
            {isRestDay ? 'Rest Day' : `${todayLabel} Day`}
          </span>
          <span className="text-white/30 text-sm">•</span>
          <span className="text-white/40 text-sm">{dateString}</span>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 animate-fade-in">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-emerald-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">AI is cooking...</p>
            <p className="text-white/40 text-sm mt-1">
              Building your perfect {todayLabel} workout
            </p>
          </div>
        </div>
      )}

      {/* Rest Day */}
      {isRestDay && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
            <BedDouble className="w-16 h-16 text-emerald-400/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Rest Day</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Recovery is where the gains happen. Stretch, hydrate, eat well,
              and come back stronger tomorrow. 💪
            </p>
          </div>
        </div>
      )}

      {/* No plan yet — Generate button */}
      {!isRestDay && !todayPlan && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
            <Dumbbell className="w-14 h-14 text-white/20 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Ready for {todayLabel}?
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Let AI generate a personalized workout based on your history and goals.
            </p>
            <button
              onClick={handleGenerate}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Generate Workout
            </button>
          </div>
        </div>
      )}

      {/* Today's plan — Exercise list */}
      {!isRestDay && todayPlan && !isGenerating && (
        <div className="flex-1 px-5 animate-slide-up">
          {/* Plan header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-white/60 text-sm font-medium">
                AI Generated Plan
              </span>
            </div>
            <span className="text-white/30 text-xs">
              {todayPlan.exercises.length} exercises
            </span>
          </div>

          {/* Exercise cards */}
          <div className="flex flex-col gap-3">
            {todayPlan.exercises.map((exercise, index) => (
              <div
                key={`${exercise.name}-${index}`}
                className="glass rounded-xl p-4 animate-slide-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-base">
                      {exercise.name}
                    </h3>
                    <p className="text-white/40 text-sm mt-1">
                      Target: {exercise.targetSets} sets × {exercise.targetReps} reps
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3">
                    {exercise.lastWeight !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/30 text-xs">Last</span>
                        <span className="text-white/60 text-sm font-medium">
                          {exercise.lastWeight}kg
                        </span>
                      </div>
                    )}
                    {exercise.suggestedWeight !== null && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-semibold">
                          {exercise.suggestedWeight}kg
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress indicator: show if we have both last and suggested */}
                {exercise.lastWeight !== null &&
                  exercise.suggestedWeight !== null &&
                  exercise.suggestedWeight > exercise.lastWeight && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400/70 text-xs">
                          +{(exercise.suggestedWeight - exercise.lastWeight).toFixed(1)}kg
                          progressive overload
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 mb-4">
            <button
              onClick={handleStartWorkout}
              className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Dumbbell className="w-5 h-5" />
              Start Workout
            </button>
            <button
              onClick={handleRemix}
              className="py-3.5 px-5 bg-white/5 hover:bg-white/10 active:bg-white/[0.03] text-white/70 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Remix
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
