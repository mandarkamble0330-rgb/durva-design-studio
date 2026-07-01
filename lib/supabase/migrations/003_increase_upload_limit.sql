-- Run this in your Supabase SQL Editor to increase the file upload limit to 20 MB

update storage.buckets
set file_size_limit = 20971520  -- 20 MB in bytes (20 * 1024 * 1024)
where id = 'project-files';
