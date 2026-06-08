/**
 * JEERA AI Service — Gemini API Integration
 * 
 * Every AI call sends the user's FULL data as context so the AI
 * knows everything: profile, workout history, PRs, plateaus.
 */

import { useStore } from '../store/useStore';
import type { WorkoutSession, TodayPlan } from '../store/useStore';



const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Build complete user context for AI ───────────────────────────────
function buildUserContext(): string {
  const state = useStore.getState();
  const { profile, workoutHistory } = state;

  // Basic info
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
      context += `\n### ${date} — ${session.dayLabel}${duration}\n`;
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
  
  // Collect max weight per exercise per session
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

// ─── Core API Call ────────────────────────────────────────────────────
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) {
    throw new Error('API key not set. Go to Settings and enter your Groq API key.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${errText}\n\nTip: Check your API key in Settings.`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}

// ─── Generate Today's Workout ─────────────────────────────────────────
export async function generateTodayWorkout(dayLabel: string): Promise<TodayPlan> {
  const context = buildUserContext();

  const systemPrompt = `You are TITAN, a smart, friendly AI gym trainer. You speak casually like a gym bro who actually knows exercise science. You know the user's complete workout history.

${context}

IMPORTANT RULES:
- Generate a workout plan for "${dayLabel}" day
- Include 4-6 exercises appropriate for "${dayLabel}"
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

  const response = await callAI(systemPrompt, userMessage);
  
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

  // Build conversation context from recent chat
  let conversationContext = '';
  const recentMessages = chatHistory.slice(-10); // last 10 messages
  if (recentMessages.length > 0) {
    conversationContext = '\n## Recent Chat History\n';
    recentMessages.forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'TITAN'}: ${msg.content}\n`;
    });
  }

  const systemPrompt = `You are TITAN, a hyper-intelligent but friendly gym bro AI. You are having a chat with your client. access to the user's complete gym data and history. 

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

  const systemPrompt = `You are JEERA, an AI gym trainer. The user is BORED of their usual routine and wants a completely fresh ${dayLabel} workout.

${context}

RULES:
- Generate a FRESH workout with exercises they haven't done recently
- Still target the right muscles for "${dayLabel}" day
- Include some unusual/fun variations to break monotony
- 4-6 exercises, with sets/reps/weight suggestions
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

  const response = await callAI(systemPrompt, `Remix my ${dayLabel} workout. Give me something fresh!`);
  
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
