import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength_size' | 'lean_muscle' | 'fat_loss';
export type SplitName = 'bro' | 'ppl' | 'upper_lower' | 'full_body' | 'custom';

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
  startWorkout: (dayLabel: string, exercises: { name: string; targetSets: number; targetReps: string; lastWeight: number | null }[]) => void;
  logSet: (exerciseIndex: number, set: SetLog) => void;
  updateSet: (exerciseIndex: number, setIndex: number, set: SetLog) => void;
  removeLastSet: (exerciseIndex: number) => void;
  swapExercise: (exerciseIndex: number, newName: string) => void;
  completeWorkout: () => void;
  cancelWorkout: () => void;
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;
  setIsGenerating: (v: boolean) => void;
  resetAll: () => void;
}

// ─── Split Presets ────────────────────────────────────────────────────
export const SPLIT_PRESETS: Record<SplitName, { label: string; days: string[] }> = {
  bro: {
    label: 'Bro Split',
    days: ['Chest', 'Back', 'Arms', 'Shoulders', 'Legs', 'Rest', 'Rest']
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
  persist(
    (set, get) => ({
      hasOnboarded: false,
      profile: DEFAULT_PROFILE,
      workoutHistory: [],
      todayPlan: null,
      activeWorkout: null,
      chatHistory: [],
      apiKey: '',
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

      startWorkout: (dayLabel, exercises) => set({
        activeWorkout: {
          dayLabel,
          exercises: exercises.map(e => ({
            ...e,
            sets: []
          })),
          startedAt: new Date().toISOString()
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
          date: new Date().toISOString(),
          dayLabel: activeWorkout.dayLabel,
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
            workoutHistory: [session, ...workoutHistory],
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
    }),
    {
      name: 'jeera-gym-store',
    }
  )
);

// ─── Helper: Get today's split day ────────────────────────────────────
export function getTodayLabel(split: string[]): string {
  const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
  // Map: Mon=0, Tue=1, ... Sun=6
  const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return split[mappedIndex] || 'Rest';
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
