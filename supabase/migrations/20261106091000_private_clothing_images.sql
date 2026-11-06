BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('wardrobe-private-images','wardrobe-private-images',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Only trusted upload code writes. Users may read their own objects and request
-- signed URLs, but cannot bypass validation or upload allowances through storage.
CREATE POLICY "Read own private clothing images" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='wardrobe-private-images' AND (storage.foldername(name))[1]=auth.uid()::text);
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS original_image_url text;
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS prepared_image_url text;
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS image_processing_job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL;
COMMIT;

-- A status request may resume an interrupted worker, but cannot create more work.
ALTER TABLE public.ai_jobs ADD COLUMN IF NOT EXISTS worker_lease_until timestamptz;

-- Preserve access to existing public photos, while requiring validated server
-- uploads for both legacy images and the new private bucket.
CREATE POLICY "Validated clothing uploads only" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK(bucket_id NOT IN ('wardrobe-images','wardrobe-private-images'));
CREATE POLICY "Validated clothing replacements only" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING(bucket_id NOT IN ('wardrobe-images','wardrobe-private-images'))
WITH CHECK(bucket_id NOT IN ('wardrobe-images','wardrobe-private-images'));
