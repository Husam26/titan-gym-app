import { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Dumbbell, Calendar } from 'lucide-react';
import { useStore, SPLIT_PRESETS } from '../store/useStore';
import type { SplitName, Experience, UserProfile } from '../store/useStore';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EXPERIENCE_OPTIONS: { value: Experience; label: string; desc: string; icon: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: '0–1 year of training', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years of training', icon: '💪' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years of training', icon: '🔥' },
];

const SPLIT_OPTIONS: { value: SplitName; emoji: string }[] = [
  { value: 'bro', emoji: '🏋️' },
  { value: 'ppl', emoji: '🔄' },
  { value: 'upper_lower', emoji: '⬆️' },
  { value: 'full_body', emoji: '🫡' },
  { value: 'custom', emoji: '✏️' },
];

export default function Onboarding() {
  const { completeOnboarding } = useStore();

  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState('');
  const [age, setAge] = useState(21);
  const [weight, setWeight] = useState(70);

  // Step 2
  const [experience, setExperience] = useState<Experience>('intermediate');

  // Step 3
  const [splitName, setSplitName] = useState<SplitName>('bro');
  const [customDays, setCustomDays] = useState<string[]>(SPLIT_PRESETS.custom.days);

  const totalSteps = 3;

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSplitChange = (s: SplitName) => {
    setSplitName(s);
    if (s !== 'custom') {
      setCustomDays(SPLIT_PRESETS[s].days);
    }
  };

  const handleCustomDayChange = (index: number, value: string) => {
    const updated = [...customDays];
    updated[index] = value;
    setCustomDays(updated);
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      name: name.trim(),
      age,
      weight,
      experience,
      goal: 'strength_size',
      splitName,
      split: splitName === 'custom' ? customDays : SPLIT_PRESETS[splitName].days,
    };
    completeOnboarding(profile);
  };

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-md px-6 pt-12 pb-4 text-center animate-fade-in">
        <h1 className="text-4xl font-black tracking-tight text-white">
          TIT<span className="text-accent">AN</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">Your AI Gym Bro</p>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-accent'
                  : i < step
                  ? 'w-2 bg-accent/50'
                  : 'w-2 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-md px-6 py-6">
        {step === 0 && <StepBasicInfo
          name={name} setName={setName}
          age={age} setAge={setAge}
          weight={weight} setWeight={setWeight}
        />}
        {step === 1 && <StepExperience
          experience={experience}
          setExperience={setExperience}
        />}
        {step === 2 && <StepSplit
          splitName={splitName}
          onSplitChange={handleSplitChange}
          customDays={customDays}
          onCustomDayChange={handleCustomDayChange}
        />}
      </div>

      {/* Footer Buttons */}
      <div className="w-full max-w-md px-6 pb-8 pt-4 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!canNext()}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            canNext()
              ? 'bg-accent hover:bg-accent-light text-black shadow-glow active:scale-[0.98]'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {step === totalSteps - 1 ? (
            <>Let's Go 💪</>
          ) : (
            <>
              Next
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Step 1: Basic Info
   ────────────────────────────────────────────── */
function StepBasicInfo({
  name, setName,
  age, setAge,
  weight, setWeight,
}: {
  name: string; setName: (v: string) => void;
  age: number; setAge: (v: number) => void;
  weight: number; setWeight: (v: number) => void;
}) {
  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">About You</h2>
        <p className="text-sm text-white/40 mt-1">Let's get to know you first</p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <User size={14} /> Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/6 text-white placeholder-white/20 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
          autoFocus
        />
      </div>

      {/* Age */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={14} /> Age
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(Math.max(10, Math.min(99, parseInt(e.target.value) || 10)))}
          min={10}
          max={99}
          className="w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/6 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
        />
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <Dumbbell size={14} /> Weight (kg)
        </label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Math.max(20, Math.min(300, parseInt(e.target.value) || 20)))}
          min={20}
          max={300}
          className="w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/6 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Step 2: Experience Level
   ────────────────────────────────────────────── */
function StepExperience({
  experience,
  setExperience,
}: {
  experience: Experience;
  setExperience: (v: Experience) => void;
}) {
  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Experience Level</h2>
        <p className="text-sm text-white/40 mt-1">How long have you been lifting?</p>
      </div>

      <div className="space-y-3">
        {EXPERIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setExperience(opt.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
              experience === opt.value
                ? 'border-accent bg-accent/10 shadow-glow'
                : 'border-white/6 bg-bg-card hover:border-white/12'
            }`}
          >
            <span className="text-3xl">{opt.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${
                experience === opt.value ? 'text-accent-light' : 'text-white'
              }`}>
                {opt.label}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{opt.desc}</p>
            </div>
            {experience === opt.value && (
              <div className="ml-auto w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Step 3: Pick Your Split
   ────────────────────────────────────────────── */
function StepSplit({
  splitName,
  onSplitChange,
  customDays,
  onCustomDayChange,
}: {
  splitName: SplitName;
  onSplitChange: (s: SplitName) => void;
  customDays: string[];
  onCustomDayChange: (index: number, value: string) => void;
}) {
  const currentDays = splitName === 'custom' ? customDays : SPLIT_PRESETS[splitName].days;

  return (
    <div className="animate-slide-up space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Pick Your Split</h2>
        <p className="text-sm text-white/40 mt-1">Choose your weekly training split</p>
      </div>

      {/* Split selector cards */}
      <div className="space-y-2.5">
        {SPLIT_OPTIONS.map((opt) => {
          const preset = SPLIT_PRESETS[opt.value];
          const isSelected = splitName === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => onSplitChange(opt.value)}
              className={`w-full p-3.5 rounded-xl border transition-all duration-200 text-left ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-glow'
                  : 'border-white/6 bg-bg-card hover:border-white/12'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.emoji}</span>
                <p className={`font-semibold text-sm ${
                  isSelected ? 'text-accent-light' : 'text-white'
                }`}>
                  {preset.label}
                </p>
                {isSelected && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Day breakdown — always shown for selected, compact for others */}
              {isSelected && opt.value !== 'custom' && (
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {preset.days.map((day, i) => (
                    <div
                      key={i}
                      className={`text-center py-1.5 rounded-lg text-[10px] font-medium ${
                        day === 'Rest'
                          ? 'bg-white/5 text-white/25'
                          : 'bg-accent/15 text-accent-light'
                      }`}
                    >
                      <span className="block text-[8px] text-white/30 mb-0.5">{DAY_LABELS[i]}</span>
                      {day}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom day editor */}
      {splitName === 'custom' && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            Customize each day
          </p>
          <div className="grid grid-cols-1 gap-2">
            {customDays.map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-white/30 w-8">{DAY_LABELS[i]}</span>
                <input
                  type="text"
                  value={day}
                  onChange={(e) => onCustomDayChange(i, e.target.value)}
                  placeholder="e.g. Chest, Rest, Push..."
                  className="flex-1 px-3 py-2.5 rounded-lg bg-bg-card border border-white/6 text-white text-sm placeholder-white/20 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview for non-custom selected splits */}
      {splitName !== 'custom' && (
        <div className="text-center">
          <p className="text-[11px] text-white/25">
            {currentDays.filter(d => d !== 'Rest').length} training days · {currentDays.filter(d => d === 'Rest').length} rest days
          </p>
        </div>
      )}
    </div>
  );
}
