/**
 * TITAN AI Service — Google Gemini API Integration
 * 
 * Every AI call sends the user's FULL data as context so the AI
 * knows everything: profile, workout history, PRs, plateaus.
 */

import { useStore } from '../store/useStore';
import type { WorkoutSession, TodayPlan, ExerciseLog } from '../store/useStore';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─── Muscle group mapping for smart workout generation ────────────────
const MUSCLE_MAP: Record<string, string> = {
  'Push': 'Chest (2 exercises: e.g. Bench Press, Incline DB Press), Shoulders (2 exercises: e.g. OHP, Lateral Raises), Triceps (1-2 exercises: e.g. Tricep Pushdowns, Overhead Extension), Abs (1 exercise)',
  'Pull': 'Back (2-3 exercises: e.g. Barbell Rows, Lat Pulldowns, Cable Rows), Biceps (1-2 exercises: e.g. Barbell Curls, Hammer Curls), Rear Delts (1 exercise: e.g. Face Pulls), Forearms (1 exercise: e.g. Wrist Curls or Farmer Walks), Abs (1 exercise)',
  'Legs': 'Quads (2 exercises: e.g. Squats, Leg Press), Hamstrings (1-2 exercises: e.g. RDL, Leg Curls), Glutes (1 exercise: e.g. Hip Thrusts), Calves (1 exercise: e.g. Standing Calf Raises), Abs (1 exercise)',
  'Chest': 'Chest (3-4 exercises: Flat Bench, Incline Press, Cable Flies, Dips), Triceps (1-2 exercises), Abs (1 exercise)',
  'Back': 'Back (3-4 exercises: Rows, Pulldowns, Deadlifts, Face Pulls), Biceps (1-2 exercises), Abs (1 exercise)',
  'Arms': 'Biceps (2-3 exercises: Barbell Curl, Hammer Curl, Concentration Curl), Triceps (2-3 exercises: Pushdowns, Skull Crushers, Dips), Forearms (1 exercise)',
  'Shoulders': 'Front Delts (1 exercise), Side Delts (2 exercises: Lateral Raises variations), Rear Delts (1 exercise: Face Pulls or Reverse Flies), Traps (1 exercise: Shrugs), Abs (1 exercise)',
  'Upper': 'Chest (1-2), Back (1-2), Shoulders (1), Biceps (1), Triceps (1), Abs (1)',
  'Lower': 'Quads (2), Hamstrings (1-2), Glutes (1), Calves (1), Abs (1)',
  'Chest & Triceps': 'Chest (3-4 exercises: Bench, Incline, Flies), Triceps (2 exercises: Pushdowns, Overhead Ext)',
  'Back & Biceps': 'Back (3-4 exercises: Pulldowns, Rows), Biceps (2 exercises: Curls, Hammer), Rear Delts (1 exercise)',
  'Shoulders & Forearms': 'Shoulders (3-4 exercises: OHP, Lateral Raises, Front Raises), Forearms (2 exercises: Wrist Curls, Reverse Curls)',
  'Legs & Abs': 'Quads (2 exercises), Hamstrings (2 exercises), Calves (1 exercise), Abs (2-3 exercises: Crunches, Planks, Leg Raises)',
  'Full Body': 'Chest (1), Back (1), Shoulders (1), Legs (1-2), Arms (1), Abs (1)',
};

// ─── Build complete user context for AI ───────────────────────────────
function buildUserContext(): string {
  const state = useStore.getState();
  const { profile, workoutHistory } = state;

  let context = `## User Profile
- Name: ${profile.name}
- Age: ${profile.age} years
- Weight: ${profile.weight} kg
- Training experience: ${profile.experience} (gym going for years)
- Goal: ${profile.goal.replace('_', ' ')}
- Current split: ${profile.splitName.toUpperCase()} — [${profile.split.join(', ')}]
- Today is: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
`;

  // Workout history (last 30 sessions max)
  const recentHistory = workoutHistory.slice(0, 30);
  if (recentHistory.length > 0) {
    context += `\n## Workout History (Last ${recentHistory.length} sessions)\n`;
    recentHistory.forEach(session => {
      const date = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const duration = session.duration ? ` (${session.duration}min)` : '';
      const backdatedTag = session.isBackdated ? ' [BACKDATED LOG: Ignore the short duration, user logged this after the fact]' : '';
      context += `\n### ${date} — ${session.dayLabel}${duration}${backdatedTag}\n`;
      session.exercises.forEach(ex => {
        const setDetails = ex.sets.map(s => `${s.weight}kg×${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(', ');
        context += `- ${ex.name}: ${setDetails}\n`;
      });
    });
  } else {
    context += `\n## Workout History\nNo workouts logged yet. This user is just starting with the app.\n`;
  }

  // Detect PRs
  const prs = detectPRs(workoutHistory);
  if (Object.keys(prs).length > 0) {
    context += `\n## Personal Records\n`;
    Object.entries(prs).forEach(([exercise, pr]) => {
      context += `- ${exercise}: ${pr.weight}kg × ${pr.reps} reps\n`;
    });
  }

  // Detect plateaus
  const plateaus = detectPlateaus(workoutHistory);
  if (plateaus.length > 0) {
    context += `\n## ⚠️ Detected Plateaus\n`;
    plateaus.forEach(p => {
      context += `- ${p.exercise}: stuck at ${p.weight}kg for ${p.sessions} sessions\n`;
    });
  }

  return context;
}

// ─── Detect Personal Records ──────────────────────────────────────────
function detectPRs(history: WorkoutSession[]): Record<string, { weight: number; reps: number }> {
  const prs: Record<string, { weight: number; reps: number }> = {};
  history.forEach(session => {
    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        const current = prs[ex.name];
        if (!current || set.weight > current.weight || (set.weight === current.weight && set.reps > current.reps)) {
          prs[ex.name] = { weight: set.weight, reps: set.reps };
        }
      });
    });
  });
  return prs;
}

// ─── Detect Plateaus (same weight for 3+ sessions) ───────────────────
function detectPlateaus(history: WorkoutSession[]): { exercise: string; weight: number; sessions: number }[] {
  const exerciseWeights: Record<string, number[]> = {};
  
  history.forEach(session => {
    session.exercises.forEach(ex => {
      if (!exerciseWeights[ex.name]) exerciseWeights[ex.name] = [];
      const maxWeight = Math.max(...ex.sets.map(s => s.weight));
      exerciseWeights[ex.name].push(maxWeight);
    });
  });

  const plateaus: { exercise: string; weight: number; sessions: number }[] = [];
  Object.entries(exerciseWeights).forEach(([exercise, weights]) => {
    if (weights.length >= 3) {
      const recentThree = weights.slice(0, 3);
      if (recentThree.every(w => w === recentThree[0])) {
        plateaus.push({ exercise, weight: recentThree[0], sessions: 3 });
      }
    }
  });

  return plateaus;
}

// ─── Core Gemini API Call ─────────────────────────────────────────────
async function callAI(systemPrompt: string, userMessage: string, jsonMode: boolean = false): Promise<string> {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) {
    throw new Error('API key not set. Go to Settings and enter your Gemini API key.');
  }

  const body: Record<string, unknown> = {
    contents: [
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errText}\n\nTip: Check your API key in Settings.`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from AI.');
  return text;
}

// ─── Generate Today's Workout ─────────────────────────────────────────
export async function generateTodayWorkout(dayLabel: string): Promise<TodayPlan> {
  const context = buildUserContext();
  const muscleGuide = MUSCLE_MAP[dayLabel] || `muscles appropriate for "${dayLabel}" day`;

  const systemPrompt = `You are TITAN, a smart, friendly AI gym trainer. You speak casually like a gym bro who actually knows exercise science. You know the user's complete workout history.

${context}

IMPORTANT RULES:
- Generate a workout plan for "${dayLabel}" day
- You MUST cover these muscle groups: ${muscleGuide}
- ALWAYS add 1-2 core/ab exercises at the end (e.g. Cable Crunches, Hanging Leg Raises, Planks, Ab Wheel Rollouts)
- Total exercises should be 6-8 (including abs)
- For each exercise, suggest target sets (3-4), target reps (range like "8-12"), and a suggested weight based on their history
- Progressive Overload Logic: If they've done the exercise before, look at their last weight and RPE. If RPE is 1-6 (easy), suggest +5kg. If RPE is 7-8 (perfect), suggest +2.5kg. If RPE is 9-10 (too hard) or missing, keep weight the same but suggest more reps.
- If they haven't done it before but similar exercises exist, estimate based on those
- If no history, suggest conservative weights for a ${useStore.getState().profile.experience} lifter at ${useStore.getState().profile.weight}kg bodyweight
- Mix in some variety — don't always suggest the exact same exercises if they've been doing them for weeks
- Respond ONLY with valid JSON, no markdown, no extra text

JSON FORMAT:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "targetSets": 4,
      "targetReps": "8-12",
      "lastWeight": null,
      "suggestedWeight": 40
    }
  ]
}`;

  const userMessage = `Generate today's ${dayLabel} workout plan for me. Give me a solid session.`;

  const response = await callAI(systemPrompt, userMessage, true);
  
  // Parse JSON from response (handle possible markdown wrapping)
  let jsonStr = response.trim();
  if (jsonStr.startsWith('\`\`\`')) {
    jsonStr = jsonStr.replace(/\`\`\`json?\n?/g, '').replace(/\`\`\`$/g, '').trim();
  }
  
  const parsed = JSON.parse(jsonStr);

  return {
    dayLabel,
    exercises: parsed.exercises,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Swap Exercise ────────────────────────────────────────────────────
export async function getSwapSuggestion(currentExercise: string, dayLabel: string): Promise<string> {
  const context = buildUserContext();

  const systemPrompt = `You are TITAN, an AI gym trainer. You know the user's full history.

${context}

The user wants to swap out "${currentExercise}" during their ${dayLabel} workout.
Suggest ONE alternative exercise that targets the same muscle group.
Pick something they haven't done recently if possible.
Respond with ONLY the exercise name, nothing else. No quotes, no explanation.`;

  const response = await callAI(systemPrompt, `Give me a swap for ${currentExercise}`);
  return response.trim().replace(/"/g, '').replace(/\n/g, '');
}

// ─── AI Coach Chat ────────────────────────────────────────────────────
export async function sendChatMessage(userMessage: string): Promise<string> {
  const context = buildUserContext();
  const chatHistory = useStore.getState().chatHistory;

  let conversationContext = '';
  const recentMessages = chatHistory.slice(-10);
  if (recentMessages.length > 0) {
    conversationContext = '\n## Recent Chat History\n';
    recentMessages.forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'TITAN'}: ${msg.content}\n`;
    });
  }

  const systemPrompt = `You are TITAN, a hyper-intelligent but friendly gym bro AI. You are having a chat with your client. You have access to the user's complete gym data and history.

Your personality:
- Talk casually like a supportive gym buddy, mix Hindi and English naturally
- Give specific, data-backed advice (reference their actual numbers)
- Be encouraging but honest
- Keep responses concise (2-4 paragraphs max)
- If they ask about nutrition, give practical advice
- If you notice issues in their data (plateaus, imbalances), proactively mention them

${context}
${conversationContext}`;

  return await callAI(systemPrompt, userMessage);
}

// ─── Remix/Regenerate Workout ─────────────────────────────────────────
export async function remixWorkout(dayLabel: string): Promise<TodayPlan> {
  const context = buildUserContext();
  const muscleGuide = MUSCLE_MAP[dayLabel] || `muscles appropriate for "${dayLabel}" day`;

  const systemPrompt = `You are TITAN, an AI gym trainer. The user is BORED of their usual routine and wants a completely fresh ${dayLabel} workout.

${context}

RULES:
- Generate a FRESH workout with exercises they haven't done recently
- You MUST cover these muscle groups: ${muscleGuide}
- ALWAYS add 1-2 core/ab exercises at the end
- Include some unusual/fun variations to break monotony
- 6-8 exercises total (including abs), with sets/reps/weight suggestions
- Respond ONLY with valid JSON

JSON FORMAT:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "targetSets": 4,
      "targetReps": "8-12",
      "lastWeight": null,
      "suggestedWeight": 40
    }
  ]
}`;

  const response = await callAI(systemPrompt, `Remix my ${dayLabel} workout. Give me something fresh!`, true);
  
  let jsonStr = response.trim();
  if (jsonStr.startsWith('\`\`\`')) {
    jsonStr = jsonStr.replace(/\`\`\`json?\n?/g, '').replace(/\`\`\`$/g, '').trim();
  }

  const parsed = JSON.parse(jsonStr);

  return {
    dayLabel,
    exercises: parsed.exercises,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Post-Workout AI Summary ──────────────────────────────────────────
export async function generateWorkoutSummary(exercises: ExerciseLog[], dayLabel: string, duration: number): Promise<string> {
  const context = buildUserContext();

  // Build current workout details
  let workoutDetails = `## Just Completed: ${dayLabel} Day (${duration} min)\n`;
  let totalVolume = 0;
  let totalSets = 0;

  exercises.forEach(ex => {
    workoutDetails += `\n### ${ex.name}\n`;
    ex.sets.forEach((s, i) => {
      const vol = s.weight * s.reps;
      totalVolume += vol;
      totalSets++;
      workoutDetails += `- Set ${i + 1}: ${s.weight}kg × ${s.reps} reps${s.rpe ? ` @RPE ${s.rpe}` : ''} (volume: ${vol}kg)\n`;
    });
  });

  workoutDetails += `\n**Total Volume:** ${totalVolume}kg across ${totalSets} sets\n`;
  workoutDetails += `**Duration:** ${duration} minutes\n`;

  const systemPrompt = `You are TITAN, a smart AI gym trainer and bro. The user just finished their workout. Give them a short, encouraging, personalized summary.

${context}

${workoutDetails}

RULES:
- Start with encouragement (e.g. "Solid push day bro! 🔥")
- Mention specific exercises and numbers — compare with their previous sessions if available
- Highlight any PRs or improvements
- If RPE was consistently high (9-10), suggest they might need a deload or to stay at current weights
- If RPE was low (1-6), tell them to push harder next time
- Point out any muscles they might have undertrained
- Keep it short: 3-5 sentences max
- Be casual and bro-like, mix Hindi-English naturally
- DO NOT use markdown formatting, just plain text with emojis`;

  return await callAI(systemPrompt, 'How was my workout? Give me your honest review.');
}
