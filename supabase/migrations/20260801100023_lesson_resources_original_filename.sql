-- P3.7: storage keys no longer embed the client-supplied filename (path
-- traversal risk) - preserve it here instead, same as media_files.original_filename.
ALTER TABLE public.lesson_resources ADD COLUMN original_filename text;
