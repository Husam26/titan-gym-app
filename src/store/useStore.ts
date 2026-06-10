import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength_size' | 'lean_muscle' | 'fat_loss';
export type SplitName = 'bro' | 'ppl' | 'upper_lower' | 'full_body' | 'custom' | 'bro_variant';

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  experience: Experience;
  goal: Goal;
  splitName: SplitName;
  split: string[]; // 7 days: ["Chest", "Back", ...]
}

export interface SetLog {
  weight: number;
  reps: number;
  rpe?: number;
}

export interface ExerciseLog {
  name: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  dayLabel: string; // "Chest", "Push", etc.
  exercises: ExerciseLog[];
  duration?: number; // minutes
  notes?: string;
  isMissed?: boolean;
  isBackdated?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TodayPlan {
  dayLabel: string;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: string; // "8-12", "6-8", etc.
    lastWeight: number | null;
    suggestedWeight: number | null;
  }[];
  generatedAt: string;
}

interface AppState {
  // Onboarding
  hasOnboarded: boolean;
  profile: UserProfile;

  // Workout data
  workoutHistory: WorkoutSession[];
  todayPlan: TodayPlan | null;

  // Active workout
  activeWorkout: {
    dayLabel: string;
    exercises: {
      name: string;
      targetSets: number;
      targetReps: string;
      lastWeight: number | null;
      sets: SetLog[];
    }[];
    startedAt: string;
    forDate?: string;
  } | null;

  // AI Chat
  chatHistory: ChatMessage[];

  // Settings
  apiKey: string;

  // Loading states
  isGenerating: boolean;

  // Actions
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setApiKey: (key: string) => void;
  setTodayPlan: (plan: TodayPlan) => void;
  startWorkout: (dayLabel: string, exercises: { name: string; targetSets: number; targetReps: string; lastWeight: number | null }[], forDate?: string) => void;
  logSet: (exerciseIndex: number, set: SetLog) => void;
  updateSet: (exerciseIndex: number, setIndex: number, set: SetLog) => void;
  removeLastSet: (exerciseIndex: number) => void;
  swapExercise: (exerciseIndex: number, newName: string) => void;
  completeWorkout: () => void;
  cancelWorkout: () => void;
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;
  setIsGenerating: (v: boolean) => void;
  markDayMissed: (date: string, dayLabel: string) => void;
  resetAll: () => void;
}

// ─── Split Presets ────────────────────────────────────────────────────
export const SPLIT_PRESETS: Record<SplitName, { label: string; days: string[] }> = {
  bro: {
    label: 'Bro Split',
    days: ['Chest', 'Back', 'Arms', 'Shoulders', 'Legs', 'Rest', 'Rest']
  },
  bro_variant: {
    label: 'Bro Split Variant',
    days: ['Chest & Triceps', 'Back & Biceps', 'Shoulders & Forearms', 'Legs & Abs', 'Rest', 'Full Body', 'Rest']
  },
  ppl: {
    label: 'Push Pull Legs',
    days: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Rest']
  },
  upper_lower: {
    label: 'Upper Lower',
    days: ['Upper', 'Lower', 'Rest', 'Upper', 'Lower', 'Rest', 'Rest']
  },
  full_body: {
    label: 'Full Body',
    days: ['Full Body', 'Rest', 'Full Body', 'Rest', 'Full Body', 'Rest', 'Rest']
  },
  custom: {
    label: 'Custom',
    days: ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest']
  }
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: 21,
  weight: 70,
  experience: 'intermediate',
  goal: 'strength_size',
  splitName: 'bro',
  split: SPLIT_PRESETS.bro.days
};

export const useStore = create<AppState>()(
  (set, get) => ({
      hasOnboarded: false,
      profile: DEFAULT_PROFILE,
      workoutHistory: [],
      todayPlan: null,
      activeWorkout: null,
      chatHistory: [],
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      isGenerating: false,

      completeOnboarding: (profile) => set({
        hasOnboarded: true,
        profile,
      }),

      updateProfile: (updates) => set((s) => ({
        profile: { ...s.profile, ...updates }
      })),

      setApiKey: (key) => set({ apiKey: key }),

      setTodayPlan: (plan) => set({ todayPlan: plan }),

      startWorkout: (dayLabel, exercises, forDate) => set({
        activeWorkout: {
          dayLabel,
          exercises: exercises.map(e => ({
            ...e,
            sets: []
          })),
          startedAt: new Date().toISOString(),
          forDate
        }
      }),

      logSet: (exerciseIndex, setData) => set((s) => {
        if (!s.activeWorkout) return {};
        const exercises = [...s.activeWorkout.exercises];
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          sets: [...exercises[exerciseIndex].sets, setData]
        };
        return { activeWorkout: { ...s.activeWorkout, exercises } };
      }),

      updateSet: (exerciseIndex, setIndex, setData) => set((s) => {
        if (!s.activeWorkout) return {};
        const exercises = [...s.activeWorkout.exercises];
        const sets = [...exercises[exerciseIndex].sets];
        sets[setIndex] = setData;
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
        return { activeWorkout: { ...s.activeWorkout, exercises } };
      }),

      removeLastSet: (exerciseIndex) => set((s) => {
        if (!s.activeWorkout) return {};
        const exercises = [...s.activeWorkout.exercises];
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          sets: exercises[exerciseIndex].sets.slice(0, -1)
        };
        return { activeWorkout: { ...s.activeWorkout, exercises } };
      }),

      swapExercise: (exerciseIndex, newName) => set((s) => {
        if (!s.activeWorkout) return {};
        const exercises = [...s.activeWorkout.exercises];
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          name: newName,
          sets: [] // reset sets for new exercise
        };
        return { activeWorkout: { ...s.activeWorkout, exercises } };
      }),

      completeWorkout: () => {
        const { activeWorkout, workoutHistory } = get();
        if (!activeWorkout) return;

        const startTime = new Date(activeWorkout.startedAt).getTime();
        const duration = Math.round((Date.now() - startTime) / 60000);

        const session: WorkoutSession = {
          id: `wo-${Date.now()}`,
          date: activeWorkout.forDate || new Date().toISOString(),
          dayLabel: activeWorkout.dayLabel,
          isBackdated: !!activeWorkout.forDate,
          exercises: activeWorkout.exercises
            .filter(e => e.sets.length > 0)
            .map(e => ({
              name: e.name,
              sets: e.sets
            })),
          duration,
        };

        if (session.exercises.length > 0) {
          set({
            workoutHistory: [session, ...workoutHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            activeWorkout: null,
            todayPlan: null, // clear today's plan after workout
          });
        } else {
          set({ activeWorkout: null });
        }
      },

      cancelWorkout: () => set({ activeWorkout: null }),

      addChatMessage: (role, content) => set((s) => ({
        chatHistory: [...s.chatHistory, {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role,
          content,
          timestamp: new Date().toISOString()
        }]
      })),

      clearChat: () => set({ chatHistory: [] }),

      setIsGenerating: (v) => set({ isGenerating: v }),

      markDayMissed: (date: string, dayLabel: string) => {
        const session: WorkoutSession = {
          id: `missed-${Date.now()}`,
          date: date,
          dayLabel: dayLabel,
          exercises: [],
          isMissed: true,
        };
        set(s => ({
          workoutHistory: [session, ...s.workoutHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));
      },

      resetAll: () => set({
        hasOnboarded: false,
        profile: DEFAULT_PROFILE,
        workoutHistory: [],
        todayPlan: null,
        activeWorkout: null,
        chatHistory: [],
        apiKey: '',
      isGenerating: false,
      }),
    })
);

// ─── Helper: Get today's split day (Smart Rotation) ───────────────────
// Instead of rigid weekday mapping, we look at what the user's LAST
// completed workout was and determine what comes NEXT in the split.
// This handles missed days properly — if you miss Pull, it stays Pull
// until you do it, rather than skipping to Legs.
export function getTodayLabel(split: string[]): string {
  const history = useStore.getState().workoutHistory;

  // Filter out rest days from split to get the training cycle
  const trainingDays = split.filter(d => d.toLowerCase() !== 'rest');
  if (trainingDays.length === 0) return 'Rest';

  // If today is a rest day in the schedule, still show rest
  const dayIndex = new Date().getDay();
  const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const scheduledDay = split[mappedIndex] || 'Rest';
  if (scheduledDay.toLowerCase() === 'rest') return 'Rest';

  // If no history yet, suggest the first training day
  if (history.length === 0) return trainingDays[0];

  // Find the last workout's position in the training cycle
  const lastWorkout = history[0]; // most recent
  const lastDayLabel = lastWorkout.dayLabel;
  const lastIdx = trainingDays.findIndex(
    d => d.toLowerCase() === lastDayLabel.toLowerCase()
  );

  // If last workout was today already, suggest same day (they might want to redo)
  const lastDate = new Date(lastWorkout.date);
  const today = new Date();
  const isSameDay = lastDate.toDateString() === today.toDateString();
  if (isSameDay) return lastDayLabel;

  // Determine next day in the cycle
  if (lastIdx === -1) {
    // Last workout label not found in current split (maybe they changed split)
    return trainingDays[0];
  }

  const nextIdx = (lastIdx + 1) % trainingDays.length;
  return trainingDays[nextIdx];
}

// ─── Helper: Get last session for a muscle group ──────────────────────
export function getLastSession(history: WorkoutSession[], dayLabel: string): WorkoutSession | null {
  return history.find(s => s.dayLabel.toLowerCase() === dayLabel.toLowerCase()) || null;
}

// ─── Helper: Get last weight for a specific exercise ──────────────────
export function getLastWeight(history: WorkoutSession[], exerciseName: string): number | null {
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase() && ex.sets.length > 0) {
        // Return the heaviest set weight
        return Math.max(...ex.sets.map(s => s.weight));
      }
    }
  }
  return null;
}
