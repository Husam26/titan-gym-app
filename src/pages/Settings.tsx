import React, { useState } from 'react';
import { useStore, SPLIT_PRESETS } from '../store/useStore';
import type { SplitName } from '../store/useStore';
import { Settings as SettingsIcon, Key, User, Target, Trash2, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const { profile, apiKey, workoutHistory, chatHistory, updateProfile, setApiKey, resetAll } = useStore();

  const [localName, setLocalName] = useState(profile.name);
  const [localAge, setLocalAge] = useState(profile.age.toString());
  const [localWeight, setLocalWeight] = useState(profile.weight.toString());
  const [localKey, setLocalKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSave = () => {
    updateProfile({
      name: localName,
      age: parseInt(localAge) || 21,
      weight: parseInt(localWeight) || 70,
    });
    setApiKey(localKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSplitChange = (splitName: SplitName) => {
    updateProfile({
      splitName,
      split: SPLIT_PRESETS[splitName].days
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-xs text-white/40">Manage your profile & preferences</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-white/80">Profile</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Name</label>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="w-full bg-bg-elevated border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Age</label>
              <input
                type="number"
                value={localAge}
                onChange={e => setLocalAge(e.target.value)}
                className="w-full bg-bg-elevated border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Weight (kg)</label>
              <input
                type="number"
                value={localWeight}
                onChange={e => setLocalWeight(e.target.value)}
                className="w-full bg-bg-elevated border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-white/80">Groq API Key</h2>
        </div>
        <input
          type="password"
          value={localKey}
          onChange={e => setLocalKey(e.target.value)}
          placeholder="gsk_..."
          className="w-full bg-bg-elevated border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition-colors font-mono"
        />
        <p className="text-[10px] text-white/30 mt-2">Required for AI features. Get one at console.groq.com</p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all mb-4 ${
          saved
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-accent text-black hover:bg-accent-light active:scale-[0.98]'
        }`}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Saved!
          </span>
        ) : 'Save Changes'}
      </button>

      {/* Split Selector */}
      <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-white/80">Training Split</h2>
        </div>
        <div className="space-y-2">
          {(Object.entries(SPLIT_PRESETS) as [SplitName, typeof SPLIT_PRESETS['bro']][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handleSplitChange(key)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                profile.splitName === key
                  ? 'bg-accent/10 border border-accent/30'
                  : 'bg-bg-elevated border border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{preset.label}</span>
                {profile.splitName === key && <Check className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-[10px] text-white/40 mt-1">
                {preset.days.join(' → ')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="glass rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-white/80 mb-3">App Data</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-bg-elevated rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-accent">{workoutHistory.length}</div>
            <div className="text-[10px] text-white/40">Workouts</div>
          </div>
          <div className="bg-bg-elevated rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-accent">{chatHistory.length}</div>
            <div className="text-[10px] text-white/40">Chat Messages</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass rounded-2xl p-4 mb-8 border-danger/20">
        <h2 className="text-sm font-semibold text-danger mb-3">Danger Zone</h2>
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="w-full py-3 rounded-xl text-sm font-medium bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Reset Everything
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/60">This will delete ALL data including workout history, chat, and profile. Are you sure?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { resetAll(); setShowReset(false); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-danger text-white"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium bg-bg-elevated text-white/60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
