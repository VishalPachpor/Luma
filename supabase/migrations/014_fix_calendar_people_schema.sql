-- Fix missing updated_at column in calendar_people table
ALTER TABLE calendar_people 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
