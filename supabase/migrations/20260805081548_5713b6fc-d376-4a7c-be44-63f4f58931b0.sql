DROP POLICY IF EXISTS "public can upload student photo" ON storage.objects;

CREATE POLICY "applicants can upload their photo"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'student-photos'
  AND (storage.foldername(name))[1] = 'applicants'
  AND array_length(storage.foldername(name), 1) = 1
  AND lower(right(name, 5)) IN ('.jpeg', '.webp')
     OR (bucket_id = 'student-photos'
         AND (storage.foldername(name))[1] = 'applicants'
         AND array_length(storage.foldername(name), 1) = 1
         AND lower(right(name, 4)) IN ('.jpg', '.png', 'heic'))
);