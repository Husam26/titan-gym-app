import React, { useState } from 'react';
import { useStore } from './store/useStore';
import Onboarding from './pages/Onboarding';
import { Today } from './pages/Today';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { Chat } from './pages/Chat';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { MessageCircle, Clock, Settings as SettingsIcon, Home, BarChart } from 'lucide-react';

type Page = 'today' | 'chat' | 'history' | 'settings' | 'analytics';

const App: React.FC = () => {
  const { hasOnboarded, activeWorkout } = useStore();
  const [activePage, setActivePage] = useState<Page>('today');

  // Show onboarding for first-time users
  if (!hasOnboarded) {
    return <Onboarding />;
  }

  // Show active workout screen if a workout is in progress
  if (activeWorkout) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg">
        <ActiveWorkout onComplete={() => setActivePage('today')} />
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
