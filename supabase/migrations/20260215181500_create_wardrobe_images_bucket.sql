-- Ensure storage bucket exists for wardrobe image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wardrobe-images',
  'wardrobe-images',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload only into their own folder:
-- original/{userId}/... and processed/{userId}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own wardrobe images'
  ) THEN
    CREATE POLICY "Users can upload own wardrobe images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'wardrobe-images'
      AND split_part(name, '/', 2) = auth.uid()::text
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own wardrobe images'
  ) THEN
    CREATE POLICY "Users can update own wardrobe images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'wardrobe-images'
      AND split_part(name, '/', 2) = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'wardrobe-images'
      AND split_part(name, '/', 2) = auth.uid()::text
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own wardrobe images'
  ) THEN
    CREATE POLICY "Users can delete own wardrobe images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'wardrobe-images'
      AND split_part(name, '/', 2) = auth.uid()::text
    );
  END IF;
END
$$;
