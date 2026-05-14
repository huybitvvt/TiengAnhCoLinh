# Briskyedu - Education Center Management

Ứng dụng quản lý trung tâm giáo dục bằng React 19, TypeScript và Vite. Repo hiện hỗ trợ 2 backend dữ liệu:

- Firebase/Firestore cho hệ thống gốc.
- Supabase REST cho các module đào tạo: thời khóa biểu, lớp học, điểm danh, học sinh.

Auth đăng nhập hiện vẫn dùng Firebase Auth. Khi chạy local với `.env.local` hiện tại, dùng Firebase emulator để đăng nhập demo và Supabase để đọc/ghi dữ liệu đào tạo.

## Tính năng chính

- Quản lý học sinh.
- Quản lý lớp học.
- Tạo và xem thời khóa biểu theo buổi học.
- Điểm danh lớp, lưu trạng thái từng học sinh.
- Chạy local bằng Firebase emulator và Supabase project riêng.

## Công nghệ

- React 19
- TypeScript
- Vite 7
- Firebase Auth / Firestore
- Supabase REST API
- Vitest

## Cấu hình Supabase

Chạy các file SQL trong Supabase SQL Editor theo đúng thứ tự:

```sql
-- 1. Tạo bảng, index, view, trigger và policy authenticated
supabase/001_training_attendance_schema.sql

-- 2. Mở policy anon/publishable key cho frontend dev
supabase/002_training_anon_policies.sql
```

Các bảng Supabase được tạo:

- `classes`
- `students`
- `student_classes`
- `class_sessions`
- `attendance_records`
- `student_attendance`

Các view hỗ trợ:

- `schedule_view`
- `attendance_summary_view`

Lưu ý: file `002_training_anon_policies.sql` dùng để app frontend gọi Supabase trực tiếp bằng publishable/anon key trong giai đoạn dev. Khi đưa production nên chuyển sang Supabase Auth hoặc backend API có service role được bảo vệ.

## Cấu hình môi trường

Repo có `.env.example` để tạo cấu hình mới. Theo yêu cầu hiện tại, `.env.local` cũng được commit để clone repo là có sẵn cấu hình demo:

```env
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-briskyedu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-briskyedu
VITE_FIREBASE_STORAGE_BUCKET=demo-briskyedu.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:demo
VITE_USE_FIREBASE_EMULATORS=true

VITE_DATA_BACKEND=supabase
VITE_SUPABASE_REST_URL=https://yhdluaslmontbqopftbd.supabase.co/rest/v1/
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_76Yxjdx3320lz9GzZQWKGw_V767ntZp
```

`VITE_DATA_BACKEND=supabase` làm cho các module lớp học, học sinh, thời khóa biểu và điểm danh dùng Supabase thay vì Firestore.

## Chạy local

Cài dependency:

```bash
npm install
```

Terminal 1 - chạy Firebase emulator cho đăng nhập demo:

```bash
npm run emulators
```

Terminal 2 - seed tài khoản demo vào emulator:

```bash
npm run seed:emulator
```

Terminal 3 - chạy Vite:

```bash
npm run dev:local
```

Mở URL Vite in ra trên terminal, thường là:

```text
http://127.0.0.1:5173/
```

## Tài khoản test

Tài khoản đăng nhập demo khi chạy bằng Firebase emulator:

```text
Email: admin@brisky.edu.vn
Password: 123456
Quyền: Quản trị viên
```

Lưu ý:

- Cần chạy `npm run emulators` và `npm run seed:emulator` trước khi đăng nhập.
- Các email nhân sự demo như `lan@brisky.edu.vn`, `hung@brisky.edu.vn`, `huong@brisky.edu.vn` chỉ là hồ sơ nhân sự, chưa phải tài khoản đăng nhập Firebase Auth.

## Lệnh phát triển

```bash
npm run dev          # Chạy Vite mặc định
npm run dev:local    # Chạy Vite trên 127.0.0.1
npm run build        # Build production
npm run preview      # Preview bản build
npm run test         # Chạy test watch mode
npm run test:run     # Chạy test một lần
npm run emulators    # Chạy Firebase Auth + Firestore emulator
npm run seed:emulator # Seed tài khoản demo cho emulator
```

## Cấu trúc quan trọng

```text
pages/
  Schedule.tsx              # Màn hình thời khóa biểu
  Attendance.tsx            # Màn hình điểm danh

src/config/
  firebase.ts               # Firebase init + emulator support
  dataBackend.ts            # Chọn firebase hoặc supabase

src/hooks/
  useClasses.ts             # Hook lớp học
  useStudents.ts            # Hook học sinh

src/services/
  classService.ts           # Service lớp học
  studentService.ts         # Service học sinh
  sessionService.ts         # Service buổi học/thời khóa biểu
  attendanceService.ts      # Service điểm danh
  supabaseRest.ts           # Supabase REST client nhẹ
  supabaseTrainingService.ts # Adapter Supabase cho module đào tạo

supabase/
  001_training_attendance_schema.sql
  002_training_anon_policies.sql
```

## Build kiểm tra

```bash
npm run build
```

Build hiện dùng Vite. Nếu đổi `.env.local`, cần restart dev server để Vite đọc lại biến môi trường.

## Ghi chú bảo mật

- Không commit Supabase `service_role` key, database password hoặc token private.
- Publishable/anon key có thể dùng ở frontend nhưng phải đi kèm RLS policy phù hợp.
- Policy anon trong `002_training_anon_policies.sql` đang mở quyền để test nhanh module đào tạo.

## License

Private - Educational use only.
