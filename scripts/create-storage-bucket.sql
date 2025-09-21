-- Create storage bucket for meditation audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('meditations', 'meditations', true);

-- Create storage policies for the meditations bucket
CREATE POLICY "Allow public uploads to meditations bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'meditations');

CREATE POLICY "Allow public access to meditations bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'meditations');

CREATE POLICY "Allow public updates to meditations bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'meditations');

CREATE POLICY "Allow public deletes from meditations bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'meditations');
