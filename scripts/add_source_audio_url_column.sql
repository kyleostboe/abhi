-- Add source_audio_url column to meditations table for high-quality source files
ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS source_audio_url text;

-- Add comment to explain the column
COMMENT ON COLUMN meditations.source_audio_url IS 'High-quality source audio URL (192kbps MP3) used for re-adjustments to prevent quality degradation';
