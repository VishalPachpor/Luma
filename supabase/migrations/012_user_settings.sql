-- Add preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Allow users to update their own preferences
-- (Policy "Users can update own profile" already covers this if it allows all columns)
