/*
  # Storage Setup for Item Images

  1. Storage
    - Create bucket for item images
    - Set up RLS policies for image access
    - Allow public read access for item images

  2. Security
    - Users can upload images for their own items
    - Public read access for all item images
    - Automatic cleanup of unused images
*/

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Users can upload item images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow public read access to item images
CREATE POLICY "Public read access for item images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'item-images');

-- Policy: Allow users to update their own images
CREATE POLICY "Users can update their own item images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete their own item images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to clean up unused images
CREATE OR REPLACE FUNCTION cleanup_unused_item_images()
RETURNS void AS $$
BEGIN
  -- Delete images that are not referenced in any items
  DELETE FROM storage.objects
  WHERE bucket_id = 'item-images'
  AND NOT EXISTS (
    SELECT 1 FROM items
    WHERE images @> ARRAY[
      CONCAT(
        'https://',
        current_setting('app.settings.supabase_url', true),
        '/storage/v1/object/public/item-images/',
        storage.objects.name
      )
    ]
  )
  AND created_at < NOW() - INTERVAL '24 hours'; -- Only delete images older than 24 hours
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily (if pg_cron is available)
-- This is optional and depends on your Supabase plan
-- SELECT cron.schedule('cleanup-unused-images', '0 2 * * *', 'SELECT cleanup_unused_item_images();');