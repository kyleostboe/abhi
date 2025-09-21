-- Add missing columns to meditations table to match the SavedMeditation interface
ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('adjuster', 'encoder')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Update existing records to have default values
UPDATE meditations 
SET 
  source = 'adjuster',
  metadata = '{}',
  original_filename = COALESCE(description, 'Unknown')
WHERE source IS NULL;

-- Make source column NOT NULL after setting defaults
ALTER TABLE meditations 
ALTER COLUMN source SET NOT NULL;
