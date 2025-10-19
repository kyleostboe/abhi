-- Create test profile for development
-- This profile is used when authentication is not yet implemented

INSERT INTO profiles (
  id,
  email,
  username,
  display_name,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'testuser',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
