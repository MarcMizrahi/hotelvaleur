GRANT SELECT, INSERT ON public.profile TO authenticated;
GRANT ALL ON public.profile TO service_role;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profile;
CREATE POLICY "Users can create their own profile"
ON public.profile FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND role = 'user');