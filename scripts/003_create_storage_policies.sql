-- Create storage policies to allow public access to meditation audio files
-- (Skip bucket creation since it already exists)

CREATE POLICY "Allow public access to meditation audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'meditation-audio');

CREATE POLICY "Allow public upload to meditation audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meditation-audio');

CREATE POLICY "Allow public update to meditation audio" ON storage.objects
  FOR UPDATE USING (bucket_id = 'meditation-audio');

CREATE POLICY "Allow public delete from meditation audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'meditation-audio');
