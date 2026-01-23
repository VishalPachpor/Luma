-- Add theme columns to events table
ALTER TABLE "events" 
ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS "theme_color" TEXT;
