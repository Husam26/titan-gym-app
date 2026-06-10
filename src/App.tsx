import React, { useState } from 'react';
import { useStore } from './store/useStore';
import Onboarding from './pages/Onboarding';
import { Today } from './pages/Today';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { Chat } from './pages/Chat';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { WorkoutSummary } from './pages/WorkoutSummary';
import { MessageCircle, Clock, Settings as SettingsIcon, Home, BarChart, Dumbbell } from 'lucide-react';
import type { ExerciseLog } from './store/useStore';

type Page = 'today' | 'chat' | 'history' | 'settings' | 'analytics';

const App: React.FC = () => {
  const { hasOnboarded, activeWorkout } = useStore();
  const [activePage, setActivePage] = useState<Page>('today');
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState<{
    exercises: ExerciseLog[];
    dayLabel: string;
    duration: number;
  } | null>(null);

  // Show onboarding for first-time users
  if (!hasOnboarded) {
    return <Onboarding />;
  }

  // Show workout summary screen after completion
  if (completedWorkout) {
    return (
      <WorkoutSummary
        exercises={completedWorkout.exercises}
        dayLabel={completedWorkout.dayLabel}
        duration={completedWorkout.duration}
        onDone={() => {
          setCompletedWorkout(null);
          setActivePage('today');
        }}
      />
    );
  }

  // Show active workout screen (full screen, not minimized)
  if (activeWorkout && !isWorkoutMinimized) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg">
        <ActiveWorkout
          onComplete={() => {
            // Capture workout data before it gets cleared
            const startTime = new Date(activeWorkout.startedAt).getTime();
            const duration = Math.round((Date.now() - startTime) / 60000);
            const exercises = activeWorkout.exercises
              .filter(e => e.sets.length > 0)
              .map(e => ({ name: e.name, sets: e.sets }));

            setCompletedWorkout({
              exercises,
              dayLabel: activeWorkout.dayLabel,
              duration,
            });
          }}
          onMinimize={() => setIsWorkoutMinimized(true)}
        />
      </div>
    );
  }

  const navItems: { key: Page; icon: React.ReactNode; label: string }[] = [
    { key: 'today', icon: <Home className="w-5 h-5" />, label: 'Today' },
    { key: 'analytics', icon: <BarChart className="w-5 h-5" />, label: 'Analytics' },
    { key: 'chat', icon: <MessageCircle className="w-5 h-5" />, label: 'Coach' },
    { key: 'history', icon: <Clock className="w-5 h-5" />, label: 'History' },
    { key: 'settings', icon: <SettingsIcon className="w-5 h-5" />, label: 'Settings' },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'today':
        return <Today onNavigate={(p) => setActivePage(p as Page)} />;
      case 'chat':
        return <Chat />;
      case 'history':
        return <History />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Today onNavigate={(p) => setActivePage(p as Page)} />;
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-bg relative overflow-hidden">

      {/* Floating resume banner when workout is minimized */}
      {activeWorkout && isWorkoutMinimized && (
        <button
          onClick={() => setIsWorkoutMinimized(false)}
          className="mx-4 mt-2 flex items-center gap-3 px-4 py-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl animate-fade-in active:scale-[0.98] transition-transform"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-emerald-400 text-sm font-semibold">Workout in progress</p>
            <p className="text-white/40 text-xs">{activeWorkout.dayLabel} Day — Tap to resume</p>
          </div>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="glass safe-bottom flex items-center justify-around px-2 py-2 border-t border-white/5">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActivePage(item.key)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              activePage === item.key
                ? 'text-accent'
                : 'text-white/30 hover:text-white/50 active:scale-95'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
