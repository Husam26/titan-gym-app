-- Run this in your Supabase SQL Editor

CREATE TABLE user_data (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    profile JSONB,
    workout_history JSONB,
    chat_history JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create an open policy for MVP (Warning: In production, use Auth UUIDs)
CREATE POLICY "Enable all access for MVP" ON user_data
    FOR ALL
    USING (true)
    WITH CHECK (true);
