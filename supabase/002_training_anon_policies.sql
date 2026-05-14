-- TEMPORARY direct-frontend policies for the 4 requested modules.
-- Use this only if the app connects with VITE_SUPABASE_PUBLISHABLE_KEY/anon key
-- and you have not wired Supabase Auth yet.
--
-- Production recommendation:
-- - use Supabase Auth and the authenticated policies from 001_training_attendance_schema.sql, or
-- - use a backend/API with the service role key, never expose service role in frontend.

drop policy if exists "anon direct all classes" on public.classes;
create policy "anon direct all classes"
on public.classes for all
to anon
using (true)
with check (true);

drop policy if exists "anon direct all students" on public.students;
create policy "anon direct all students"
on public.students for all
to anon
using (true)
with check (true);

drop policy if exists "anon direct all student_classes" on public.student_classes;
create policy "anon direct all student_classes"
on public.student_classes for all
to anon
using (true)
with check (true);

drop policy if exists "anon direct all class_sessions" on public.class_sessions;
create policy "anon direct all class_sessions"
on public.class_sessions for all
to anon
using (true)
with check (true);

drop policy if exists "anon direct all attendance_records" on public.attendance_records;
create policy "anon direct all attendance_records"
on public.attendance_records for all
to anon
using (true)
with check (true);

drop policy if exists "anon direct all student_attendance" on public.student_attendance;
create policy "anon direct all student_attendance"
on public.student_attendance for all
to anon
using (true)
with check (true);

