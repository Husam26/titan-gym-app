import React, { useState, useMemo } from 'react';
import { useStore, getTodayLabel } from '../store/useStore';
import { generateTodayWorkout, remixWorkout } from '../services/ai';
import { Dumbbell, RefreshCw, Sparkles, Loader2, BedDouble, ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';

export const Today: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const profile = useStore((s) => s.profile);
  const todayPlan = useStore((s) => s.todayPlan);
  const isGenerating = useStore((s) => s.isGenerating);
  const workoutHistory = useStore((s) => s.workoutHistory);
  const setTodayPlan = useStore((s) => s.setTodayPlan);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const startWorkout = useStore((s) => s.startWorkout);
  const markDayMissed = useStore((s) => s.markDayMissed);

  // Default to today
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Check if selected date is strictly today
  const isToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  // Check if selected date is in the future
  const isFuture = useMemo(() => {
    const now = new Date();
    // Reset times to compare just dates
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return selected.getTime() > today.getTime();
  }, [selectedDate]);

  const dateString = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Find if a session exists for the selected date
  const sessionForSelectedDate = useMemo(() => {
    const selectedStr = selectedDate.toDateString();
    return workoutHistory.find(s => new Date(s.date).toDateString() === selectedStr);
  }, [selectedDate, workoutHistory]);

  // Determine what day label should be suggested (if logging new)
  const scheduledLabel = isToday ? getTodayLabel(profile.split) : getTodayLabel(profile.split); // We use the next scheduled cycle
  const isRestDay = scheduledLabel.toLowerCase() === 'rest';

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const plan = await generateTodayWorkout(scheduledLabel);
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
      const plan = await remixWorkout(scheduledLabel);
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
      })),
      isToday ? undefined : selectedDate.toISOString() // pass forDate if backdating
    );
    onNavigate('active-workout');
  };

  const handleMarkMissed = () => {
    markDayMissed(selectedDate.toISOString(), scheduledLabel);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 animate-fade-in flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">
            Hey {profile.name || 'there'} 👋
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-emerald-400 font-semibold text-sm">
              {isRestDay ? 'Rest Day' : `${scheduledLabel} Day`}
            </span>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="px-5 mb-4 animate-fade-in">
        <div className="flex items-center justify-between glass rounded-xl p-2">
          <button onClick={handlePrevDay} className="p-2 text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-white font-medium">{isToday ? 'Today' : dateString}</span>
          </div>
          <button 
            onClick={handleNextDay} 
            disabled={isFuture || isToday}
            className={`p-2 transition-colors rounded-lg ${isFuture || isToday ? 'text-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Future Date View */}
      {isFuture && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
            <p className="text-white/50 text-sm">You can't log workouts in the future yet! 🚀</p>
          </div>
        </div>
      )}

      {/* Completed Session View (for selected date) */}
      {!isFuture && sessionForSelectedDate && !sessionForSelectedDate.isMissed && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full border border-emerald-500/20 bg-emerald-500/5">
            <Dumbbell className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-1">
              Workout Completed!
            </h2>
            <p className="text-emerald-400/80 text-sm mb-4 font-medium">
              {sessionForSelectedDate.dayLabel} • {sessionForSelectedDate.duration || 0} mins
            </p>
            <p className="text-white/50 text-xs mb-6">
              You crushed {sessionForSelectedDate.exercises.length} exercises on this day.
            </p>
            <button
              onClick={() => onNavigate('history')}
              className="w-full py-3 bg-white/5 hover:bg-white/10 active:bg-white/[0.03] text-white/70 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/10"
            >
              View in History
            </button>
          </div>
        </div>
      )}

      {/* Missed Session View (for selected date) */}
      {!isFuture && sessionForSelectedDate && sessionForSelectedDate.isMissed && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full border border-red-500/20 bg-red-500/5">
            <CalendarX2 className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Marked as Missed
            </h2>
            <p className="text-white/50 text-sm mb-6">
              You marked {sessionForSelectedDate.dayLabel} day as missed. Don't worry, consistency is a marathon, not a sprint!
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isFuture && !sessionForSelectedDate && isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 animate-fade-in">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-emerald-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">AI is cooking...</p>
            <p className="text-white/40 text-sm mt-1">
              Building your perfect {scheduledLabel} workout
            </p>
          </div>
        </div>
      )}

      {/* Rest Day (No session) */}
      {!isFuture && !sessionForSelectedDate && isRestDay && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
            <BedDouble className="w-16 h-16 text-emerald-400/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Rest Day</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Recovery is where the gains happen. Stretch, hydrate, eat well,
              and come back stronger tomorrow. 💪
            </p>
            {!isToday && (
               <button
                 onClick={handleGenerate}
                 className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-xl transition-colors border border-white/10"
               >
                 Log a workout anyway
               </button>
            )}
          </div>
        </div>
      )}

      {/* No plan yet — Generate button */}
      {!isFuture && !sessionForSelectedDate && !isRestDay && !todayPlan && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-slide-up">
          <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
            <Dumbbell className="w-14 h-14 text-white/20 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Ready for {scheduledLabel}?
            </h2>
            <p className="text-white/40 text-sm mb-6">
              {isToday ? 'Let AI generate a personalized workout based on your history.' : 'Backdate a missed log. AI will generate a plan for this past day.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerate}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-5 h-5" />
                {isToday ? 'Generate Workout' : 'Log Past Workout'}
              </button>
              
              {!isToday && (
                <button
                  onClick={handleMarkMissed}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                >
                  <CalendarX2 className="w-4 h-4" />
                  Mark as Missed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's plan — Exercise list */}
      {!isFuture && !sessionForSelectedDate && !isRestDay && todayPlan && !isGenerating && (
        <div className="flex-1 px-5 animate-slide-up">
          {/* Plan header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-white/60 text-sm font-medium">
                AI Generated Plan {isToday ? '' : '(Backdated)'}
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
              className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Dumbbell className="w-5 h-5" />
              {isToday ? 'Start Workout' : 'Start Backdated Workout'}
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
