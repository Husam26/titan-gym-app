import { useStore } from '../store/useStore';
import { supabase } from './supabase';

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const SYNC_DELAY = 5000; // 5 seconds debounce

// Single global user ID for MVP (since there's no real login system yet)
const MVP_USER_ID = 'user_1'; 

export function initSync() {
  // Subscribe to Zustand store changes
  useStore.subscribe((state, prevState) => {
    // Only sync if they have onboarded and something important changed
    if (!state.hasOnboarded) return;

    // Check if meaningful data changed to avoid spamming the DB
    const changed = 
      state.workoutHistory !== prevState.workoutHistory ||
      state.profile !== prevState.profile ||
      state.chatHistory !== prevState.chatHistory;

    if (changed) {
      if (syncTimeout) clearTimeout(syncTimeout);
      
      syncTimeout = setTimeout(async () => {
        try {
          // Push to Supabase
          const { error } = await supabase
            .from('user_data')
            .upsert({ 
              id: MVP_USER_ID,
              user_name: state.profile.name || 'Anonymous',
              profile: state.profile,
              workout_history: state.workoutHistory,
              chat_history: state.chatHistory,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          
          if (error) {
            console.error('Supabase sync error:', error);
          } else {
            console.log('✅ Synced to Supabase');
          }
        } catch (err) {
          console.error('Failed to sync to Supabase (offline)', err);
        }
      }, SYNC_DELAY);
    }
  });
}

// Function to pull data from Supabase on first load (if needed)
export async function pullFromCloud() {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('id', MVP_USER_ID)
      .single();

    if (error) throw error;

    if (data) {
      // Hydrate store
      useStore.setState({
        profile: data.profile,
        workoutHistory: data.workout_history,
        chatHistory: data.chat_history,
        hasOnboarded: true,
      });
      return true;
    }
  } catch (err) {
    console.error('Pull from cloud failed:', err);
    return false;
  }
}
