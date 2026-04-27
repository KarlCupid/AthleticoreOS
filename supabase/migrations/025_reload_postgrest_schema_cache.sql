-- Ensure PostgREST sees freshly-added profile columns immediately.

NOTIFY pgrst, 'reload schema';
