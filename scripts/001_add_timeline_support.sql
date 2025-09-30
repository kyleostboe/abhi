-- This script ensures the meditations table metadata column can store timeline data
-- The metadata column is already JSONB, so no schema changes are needed
-- This script is for documentation purposes

-- Example of what timeline data looks like in metadata:
-- {
--   "instructionCount": 3,
--   "soundCuesUsed": ["bell_high", "chime_soft"],
--   "timeline": [
--     {
--       "id": "instr_1",
--       "text": "Take a deep breath",
--       "startTime": 0,
--       "endTime": 5,
--       "soundId": "bell_high",
--       "keepOriginal": true,
--       "originalVolume": 70,
--       "soundVolume": 60
--     }
--   ],
--   "wav": {
--     "sampleRate": 44100,
--     "bitDepth": 16
--   }
-- }

-- Verify the meditations table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meditations' 
AND column_name = 'metadata';

-- Count meditations with timeline data
SELECT 
  COUNT(*) as total_meditations,
  COUNT(CASE WHEN metadata->>'timeline' IS NOT NULL THEN 1 END) as with_timeline,
  COUNT(CASE WHEN metadata->>'timeline' IS NULL THEN 1 END) as without_timeline
FROM meditations;
