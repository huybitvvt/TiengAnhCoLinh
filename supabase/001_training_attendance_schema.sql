-- BriskyEdu Supabase schema
-- Modules:
-- 1. Thoi khoa bieu: class_sessions
-- 2. Lop hoc: classes
-- 3. Diem danh: attendance_records, student_attendance
-- 4. Hoc sinh: students
--
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- 1) Lop hoc
-- =========================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'Đang học'
    check (status in ('Đang học', 'Kết thúc', 'Tạm dừng', 'Chờ mở')),
  curriculum text,
  curriculum_id text,
  age_group text,
  progress text,
  total_sessions integer not null default 0 check (total_sessions >= 0),

  teacher_id text,
  teacher text,
  teacher_duration integer check (teacher_duration is null or teacher_duration >= 0),
  teacher_start_time time,
  teacher_end_time time,

  assistant_id text,
  assistant text,
  assistant_duration integer check (assistant_duration is null or assistant_duration >= 0),
  assistant_start_time time,
  assistant_end_time time,

  foreign_teacher_id text,
  foreign_teacher text,
  foreign_teacher_duration integer check (foreign_teacher_duration is null or foreign_teacher_duration >= 0),
  foreign_teacher_start_time time,
  foreign_teacher_end_time time,

  students_count integer not null default 0 check (students_count >= 0),
  trial_students integer not null default 0 check (trial_students >= 0),
  active_students integer not null default 0 check (active_students >= 0),
  debt_students integer not null default 0 check (debt_students >= 0),
  reserved_students integer not null default 0 check (reserved_students >= 0),

  -- Weekly schedule text, e.g. "Thứ 2, 4, 6 (17h30-19h00)"
  schedule text,
  -- Optional structured schedule rows, compatible with the current app model.
  schedule_details jsonb not null default '[]'::jsonb,

  room text,
  branch text,
  color integer check (color is null or (color >= 0 and color <= 15)),
  start_date date,
  end_date date,
  training_history jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint classes_branch_name_unique unique (branch, name)
);

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

-- =========================================
-- 2) Hoc sinh
-- =========================================

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  full_name text not null,
  dob date,
  gender text check (gender is null or gender in ('Nam', 'Nữ')),
  phone text,

  parent_name text,
  parent_phone text,
  parent_id text,

  status text not null default 'Đang học'
    check (status in ('Đang học', 'Nợ phí', 'Nợ hợp đồng', 'Bảo lưu', 'Nghỉ học', 'Học thử', 'Đã học hết phí')),

  branch text,
  class_id uuid references public.classes(id) on delete set null,
  class_name text,
  -- Supports multi-class students without forcing another table in the first migration.
  class_ids uuid[] not null default '{}'::uuid[],

  registered_sessions integer not null default 0 check (registered_sessions >= 0),
  attended_sessions integer not null default 0 check (attended_sessions >= 0),
  remaining_sessions integer not null default 0,
  legacy_attended_sessions integer not null default 0 check (legacy_attended_sessions >= 0),
  makeup_sessions_attended integer not null default 0 check (makeup_sessions_attended >= 0),

  start_session_number integer check (start_session_number is null or start_session_number >= 1),
  enrollment_date date,
  start_date date,
  expected_end_date date,

  reserve_date date,
  reserve_note text,
  reserve_sessions integer check (reserve_sessions is null or reserve_sessions >= 0),

  dropout_reason text,
  dropout_date date,

  bad_debt boolean not null default false,
  bad_debt_sessions integer not null default 0 check (bad_debt_sessions >= 0),
  bad_debt_amount numeric(14,2) not null default 0 check (bad_debt_amount >= 0),
  bad_debt_date date,
  bad_debt_note text,

  contract_debt numeric(14,2) not null default 0 check (contract_debt >= 0),
  next_payment_date date,

  care_history jsonb not null default '[]'::jsonb,
  class_progress jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

-- Optional normalized multi-class relation.
create table if not exists public.student_classes (
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  class_name text,
  status text not null default 'Đang học'
    check (status in ('Đang học', 'Bảo lưu', 'Nghỉ học', 'Chuyển lớp', 'Kết thúc')),
  registered_sessions integer not null default 0 check (registered_sessions >= 0),
  attended_sessions integer not null default 0 check (attended_sessions >= 0),
  absent_sessions integer not null default 0 check (absent_sessions >= 0),
  makeup_owed integer not null default 0 check (makeup_owed >= 0),
  makeup_done integer not null default 0 check (makeup_done >= 0),
  reserved_sessions integer not null default 0 check (reserved_sessions >= 0),
  joined_at date not null default current_date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, class_id)
);

drop trigger if exists trg_student_classes_updated_at on public.student_classes;
create trigger trg_student_classes_updated_at
before update on public.student_classes
for each row execute function public.set_updated_at();

-- =========================================
-- 3) Thoi khoa bieu / Buoi hoc
-- =========================================

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  class_name text not null,
  session_number integer not null check (session_number > 0),
  session_date date not null,
  day_of_week text,
  time_start time,
  time_end time,
  time_label text,
  room text,
  teacher_id text,
  teacher_name text,
  status text not null default 'Chưa học'
    check (status in ('Chưa học', 'Đã học', 'Nghỉ', 'Học bù')),
  attendance_id uuid,
  holiday_id text,
  holiday_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint class_sessions_class_number_unique unique (class_id, session_number)
);

drop trigger if exists trg_class_sessions_updated_at on public.class_sessions;
create trigger trg_class_sessions_updated_at
before update on public.class_sessions
for each row execute function public.set_updated_at();

-- =========================================
-- 4) Diem danh
-- =========================================

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  class_name text not null,
  attendance_date date not null,
  session_number integer check (session_number is null or session_number > 0),
  session_id uuid references public.class_sessions(id) on delete set null,

  total_students integer not null default 0 check (total_students >= 0),
  present integer not null default 0 check (present >= 0),
  absent integer not null default 0 check (absent >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  tutored integer not null default 0 check (tutored >= 0),

  status text not null default 'Chưa điểm danh'
    check (status in ('Đã điểm danh', 'Chưa điểm danh', 'LỊCH NGHỈ CHUNG')),
  attendance_type text not null default 'session'
    check (attendance_type in ('session', 'makeup', 'manual')),

  holiday_id text,
  holiday_name text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attendance_records_class_date_unique unique (class_id, attendance_date),
  constraint attendance_records_counts_valid check (
    present + absent + reserved + tutored <= total_students
  )
);

drop trigger if exists trg_attendance_records_updated_at on public.attendance_records;
create trigger trg_attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance_records(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  student_name text not null,
  student_code text not null,
  class_id uuid references public.classes(id) on delete set null,
  class_name text,
  attendance_date date,
  session_number integer check (session_number is null or session_number > 0),

  status text not null default ''
    check (status in ('', 'Đúng giờ', 'Trễ giờ', 'Vắng', 'Bảo lưu', 'Đã bồi')),
  note text,

  homework_completion integer check (homework_completion is null or (homework_completion >= 0 and homework_completion <= 100)),
  test_name text,
  score numeric(4,2) check (score is null or (score >= 0 and score <= 10)),
  bonus_points numeric(6,2) check (bonus_points is null or bonus_points >= 0),

  punctuality text check (punctuality is null or punctuality in ('onTime', 'late', '')),
  is_late boolean not null default false,
  attendance_type text not null default 'session'
    check (attendance_type in ('session', 'makeup', 'manual')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint student_attendance_one_per_record unique (attendance_id, student_id)
);

drop trigger if exists trg_student_attendance_updated_at on public.student_attendance;
create trigger trg_student_attendance_updated_at
before update on public.student_attendance
for each row execute function public.set_updated_at();

alter table public.class_sessions
drop constraint if exists class_sessions_attendance_id_fkey;

alter table public.class_sessions
add constraint class_sessions_attendance_id_fkey
foreign key (attendance_id) references public.attendance_records(id) on delete set null;

-- =========================================
-- Indexes
-- =========================================

create index if not exists idx_classes_status on public.classes(status);
create index if not exists idx_classes_branch on public.classes(branch);
create index if not exists idx_students_status on public.students(status);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_students_branch on public.students(branch);
create index if not exists idx_student_classes_class_id on public.student_classes(class_id);
create index if not exists idx_class_sessions_class_date on public.class_sessions(class_id, session_date);
create index if not exists idx_class_sessions_status_date on public.class_sessions(status, session_date);
create index if not exists idx_attendance_records_class_date on public.attendance_records(class_id, attendance_date desc);
create index if not exists idx_attendance_records_session_id on public.attendance_records(session_id);
create index if not exists idx_student_attendance_attendance_id on public.student_attendance(attendance_id);
create index if not exists idx_student_attendance_student_class_date on public.student_attendance(student_id, class_id, attendance_date);
create index if not exists idx_student_attendance_session_id on public.student_attendance(session_id);

-- =========================================
-- Useful views
-- =========================================

create or replace view public.schedule_view as
select
  cs.id as session_id,
  cs.class_id,
  c.name as class_name,
  c.branch,
  c.schedule as weekly_schedule,
  cs.session_number,
  cs.session_date,
  cs.day_of_week,
  cs.time_start,
  cs.time_end,
  cs.time_label,
  coalesce(cs.room, c.room) as room,
  coalesce(cs.teacher_name, c.teacher) as teacher,
  cs.status,
  cs.attendance_id
from public.class_sessions cs
join public.classes c on c.id = cs.class_id;

create or replace view public.attendance_summary_view as
select
  ar.id as attendance_id,
  ar.class_id,
  ar.class_name,
  ar.attendance_date,
  ar.session_id,
  ar.session_number,
  ar.total_students,
  ar.present,
  ar.absent,
  ar.reserved,
  ar.tutored,
  ar.status,
  ar.attendance_type,
  ar.updated_at
from public.attendance_records ar;

-- =========================================
-- RLS policies
-- =========================================
-- Default: only Supabase authenticated users can read/write.
-- If the frontend only uses anon key without Supabase Auth, these policies will block access.
-- For production, keep this secure model and login with Supabase Auth or use a backend/service role.

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.student_classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.student_attendance enable row level security;

drop policy if exists "authenticated read classes" on public.classes;
create policy "authenticated read classes"
on public.classes for select
to authenticated
using (true);

drop policy if exists "authenticated write classes" on public.classes;
create policy "authenticated write classes"
on public.classes for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read students" on public.students;
create policy "authenticated read students"
on public.students for select
to authenticated
using (true);

drop policy if exists "authenticated write students" on public.students;
create policy "authenticated write students"
on public.students for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read student_classes" on public.student_classes;
create policy "authenticated read student_classes"
on public.student_classes for select
to authenticated
using (true);

drop policy if exists "authenticated write student_classes" on public.student_classes;
create policy "authenticated write student_classes"
on public.student_classes for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read class_sessions" on public.class_sessions;
create policy "authenticated read class_sessions"
on public.class_sessions for select
to authenticated
using (true);

drop policy if exists "authenticated write class_sessions" on public.class_sessions;
create policy "authenticated write class_sessions"
on public.class_sessions for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read attendance_records" on public.attendance_records;
create policy "authenticated read attendance_records"
on public.attendance_records for select
to authenticated
using (true);

drop policy if exists "authenticated write attendance_records" on public.attendance_records;
create policy "authenticated write attendance_records"
on public.attendance_records for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read student_attendance" on public.student_attendance;
create policy "authenticated read student_attendance"
on public.student_attendance for select
to authenticated
using (true);

drop policy if exists "authenticated write student_attendance" on public.student_attendance;
create policy "authenticated write student_attendance"
on public.student_attendance for all
to authenticated
using (true)
with check (true);

-- TEMP DEV ONLY, if you need direct anon-key testing before Supabase Auth is wired:
-- create policy "anon dev all classes" on public.classes for all to anon using (true) with check (true);
-- create policy "anon dev all students" on public.students for all to anon using (true) with check (true);
-- create policy "anon dev all student_classes" on public.student_classes for all to anon using (true) with check (true);
-- create policy "anon dev all class_sessions" on public.class_sessions for all to anon using (true) with check (true);
-- create policy "anon dev all attendance_records" on public.attendance_records for all to anon using (true) with check (true);
-- create policy "anon dev all student_attendance" on public.student_attendance for all to anon using (true) with check (true);

