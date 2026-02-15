-- Add cover_image column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_image text;

-- Add comment
COMMENT ON COLUMN public.profiles.cover_image IS 'URL to the user''s profile cover image';
