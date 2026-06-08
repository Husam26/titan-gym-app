import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Activity, Flame } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { workoutHistory } = useStore();

  const volumeData = useMemo(() => {
    // Process last 14 workouts for volume chart
    return [...workoutHistory]
      .slice(0, 14)
      .reverse()
      .map(session => {
        let totalVolume = 0;
        session.exercises.forEach(ex => {
          ex.sets.forEach(s => {
            totalVolume += (s.weight * s.reps);
          });
        });

        const date = new Date(session.date);
        return {
          name: `${date.getDate()}/${date.getMonth() + 1}`,
          volume: totalVolume,
          label: session.dayLabel
        };
      });
  }, [workoutHistory]);

  const stats = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    let totalSets = 0;
    let maxVolume = 0;

    workoutHistory.forEach(s => {
      let sessionVolume = 0;
      s.exercises.forEach(ex => {
        totalSets += ex.sets.length;
        ex.sets.forEach(set => sessionVolume += (set.weight * set.reps));
      });
      if (sessionVolume > maxVolume) maxVolume = sessionVolume;
    });

    return { totalWorkouts, totalSets, maxVolume };
  }, [workoutHistory]);

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-xs text-white/40">Track your progress and volume</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass rounded-2xl p-4 flex flex-col justify-center animate-fade-in">
          <Activity className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-black">{stats.totalWorkouts}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Total Workouts</p>
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col justify-center animate-fade-in" style={{ animationDelay: '100ms' }}>
          <Flame className="w-5 h-5 text-orange-400 mb-2" />
          <p className="text-2xl font-black">{stats.totalSets}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Sets Completed</p>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="glass rounded-2xl p-4 mb-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-sm font-semibold text-white/80 mb-4">Recent Volume (kg)</h2>
        
        {volumeData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-white/30 text-sm">
            Complete a workout to see data
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="volume" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Session Highlights */}
      <div className="glass rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h2 className="text-sm font-semibold text-white/80 mb-3">Highlights</h2>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <span className="text-sm text-white/60">Highest Volume Session</span>
          <span className="font-bold text-accent">{stats.maxVolume} kg</span>
        </div>
      </div>

    </div>
  );
};
