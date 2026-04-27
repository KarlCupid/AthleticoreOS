-- Ensure auth users are mirrored into public.users before profile creation.

INSERT INTO public.users (id, email, role)
SELECT
  au.id,
  COALESCE(NULLIF(au.email, ''), au.id::text || '@unknown.local'),
  CASE
    WHEN au.raw_user_meta_data ->> 'role' IN ('athlete', 'coach', 'admin')
      THEN au.raw_user_meta_data ->> 'role'
    ELSE 'athlete'
  END
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_current_user()
RETURNS void AS $$
DECLARE
  current_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  current_email := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    auth.uid()::text || '@unknown.local'
  );

  INSERT INTO public.users (id, email, role)
  VALUES (auth.uid(), current_email, 'athlete')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.ensure_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    COALESCE(NULLIF(new.email, ''), new.id::text || '@unknown.local'),
    'athlete'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

NOTIFY pgrst, 'reload schema';
