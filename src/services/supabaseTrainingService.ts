import { AttendanceRecord, AttendanceStatus, ClassModel, ClassStatus, Student, StudentAttendance, StudentStatus } from '../../types';
import {
  addEq,
  addGte,
  addLimit,
  addLte,
  addOrder,
  addSelect,
  removeUndefined,
  supabaseRequest,
} from './supabaseRest';
import type { ClassSession } from './sessionService';

type Row = Record<string, any>;

const toDate = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  return '';
};

const toTimeLabel = (start?: string | null, end?: string | null, fallback?: string | null): string | undefined => {
  if (fallback) return fallback;
  if (start && end) return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
  return undefined;
};

const parseTimeLabel = (time?: string): { time_start?: string | null; time_end?: string | null; time_label?: string | null } => {
  if (!time) return {};
  const [start, end] = time.split('-').map(v => v?.trim()).filter(Boolean);
  return {
    time_start: start || null,
    time_end: end || null,
    time_label: time,
  };
};

const sortByDate = <T extends { date?: string }>(items: T[]) =>
  [...items].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

export const mapClassFromSupabase = (row: Row): ClassModel => ({
  id: row.id,
  name: row.name || '',
  status: row.status || ClassStatus.STUDYING,
  curriculum: row.curriculum || '',
  ageGroup: row.age_group || '',
  progress: row.progress || '',
  totalSessions: row.total_sessions ?? 0,
  teacher: row.teacher || '',
  teacherId: row.teacher_id || '',
  teacherDuration: row.teacher_duration ?? undefined,
  teacherStartTime: row.teacher_start_time || undefined,
  teacherEndTime: row.teacher_end_time || undefined,
  assistant: row.assistant || '',
  assistantDuration: row.assistant_duration ?? undefined,
  assistantStartTime: row.assistant_start_time || undefined,
  assistantEndTime: row.assistant_end_time || undefined,
  foreignTeacher: row.foreign_teacher || '',
  foreignTeacherDuration: row.foreign_teacher_duration ?? undefined,
  foreignTeacherStartTime: row.foreign_teacher_start_time || undefined,
  foreignTeacherEndTime: row.foreign_teacher_end_time || undefined,
  studentsCount: row.students_count ?? 0,
  trialStudents: row.trial_students ?? 0,
  activeStudents: row.active_students ?? 0,
  debtStudents: row.debt_students ?? 0,
  reservedStudents: row.reserved_students ?? 0,
  schedule: row.schedule || '',
  scheduleDetails: row.schedule_details || [],
  room: row.room || '',
  branch: row.branch || '',
  color: row.color ?? undefined,
  startDate: toDate(row.start_date),
  endDate: toDate(row.end_date),
  trainingHistory: row.training_history || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const classToSupabase = (data: Partial<ClassModel>): Row => removeUndefined({
  name: data.name?.trim(),
  status: data.status,
  curriculum: data.curriculum,
  age_group: data.ageGroup,
  progress: data.progress,
  total_sessions: data.totalSessions,
  teacher: data.teacher,
  teacher_id: data.teacherId,
  teacher_duration: data.teacherDuration,
  teacher_start_time: data.teacherStartTime || null,
  teacher_end_time: data.teacherEndTime || null,
  assistant: data.assistant,
  assistant_id: (data as any).assistantId,
  assistant_duration: data.assistantDuration,
  assistant_start_time: data.assistantStartTime || null,
  assistant_end_time: data.assistantEndTime || null,
  foreign_teacher: data.foreignTeacher,
  foreign_teacher_id: (data as any).foreignTeacherId,
  foreign_teacher_duration: data.foreignTeacherDuration,
  foreign_teacher_start_time: data.foreignTeacherStartTime || null,
  foreign_teacher_end_time: data.foreignTeacherEndTime || null,
  students_count: data.studentsCount,
  trial_students: data.trialStudents,
  active_students: data.activeStudents,
  debt_students: data.debtStudents,
  reserved_students: data.reservedStudents,
  schedule: data.schedule,
  schedule_details: data.scheduleDetails,
  room: data.room,
  branch: data.branch,
  color: data.color,
  start_date: data.startDate || null,
  end_date: data.endDate || null,
  training_history: data.trainingHistory,
});

export const supabaseClassService = {
  async getClasses(filters?: { status?: ClassStatus; teacherId?: string; searchTerm?: string }): Promise<ClassModel[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'status', filters?.status);
    addEq(params, 'teacher_id', filters?.teacherId);
    addOrder(params, 'created_at', false);
    const rows = await supabaseRequest<Row[]>('classes', params);
    let classes = rows.map(mapClassFromSupabase);
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      classes = classes.filter(c => c.name?.toLowerCase().includes(term) || c.curriculum?.toLowerCase().includes(term));
    }
    return classes;
  },

  async getClassById(id: string): Promise<ClassModel | null> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'id', id);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('classes', params);
    return rows[0] ? mapClassFromSupabase(rows[0]) : null;
  },

  async createClass(data: Omit<ClassModel, 'id'>): Promise<string> {
    const rows = await supabaseRequest<Row[]>('classes', undefined, {
      method: 'POST',
      body: JSON.stringify(classToSupabase(data)),
    });
    return rows[0].id;
  },

  async updateClass(id: string, updates: Partial<ClassModel>): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<Row[]>('classes', params, {
      method: 'PATCH',
      body: JSON.stringify(classToSupabase(updates)),
    });
  },

  async deleteClass(id: string): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<null>('classes', params, { method: 'DELETE' });
  },
};

export const mapStudentFromSupabase = (row: Row): Student => ({
  id: row.id,
  code: row.code || '',
  fullName: row.full_name || '',
  dob: toDate(row.dob),
  gender: row.gender || 'Nam',
  phone: row.phone || '',
  parentId: row.parent_id || undefined,
  parentName: row.parent_name || undefined,
  parentPhone: row.parent_phone || undefined,
  status: row.status || StudentStatus.ACTIVE,
  careHistory: row.care_history || [],
  branch: row.branch || undefined,
  class: row.class_name || undefined,
  className: row.class_name || undefined,
  classId: row.class_id || undefined,
  classIds: row.class_ids || [],
  registeredSessions: row.registered_sessions ?? 0,
  attendedSessions: row.attended_sessions ?? 0,
  remainingSessions: row.remaining_sessions ?? 0,
  legacyAttendedSessions: row.legacy_attended_sessions ?? 0,
  makeupSessionsAttended: row.makeup_sessions_attended ?? 0,
  startSessionNumber: row.start_session_number ?? undefined,
  enrollmentDate: toDate(row.enrollment_date),
  startDate: toDate(row.start_date),
  expectedEndDate: toDate(row.expected_end_date),
  reserveDate: toDate(row.reserve_date),
  reserveNote: row.reserve_note || undefined,
  reserveSessions: row.reserve_sessions ?? undefined,
  dropoutReason: row.dropout_reason || undefined,
  dropoutDate: toDate(row.dropout_date),
  badDebt: row.bad_debt ?? false,
  badDebtSessions: row.bad_debt_sessions ?? 0,
  badDebtAmount: row.bad_debt_amount ?? 0,
  badDebtDate: toDate(row.bad_debt_date),
  badDebtNote: row.bad_debt_note || undefined,
  contractDebt: row.contract_debt ?? 0,
  nextPaymentDate: toDate(row.next_payment_date),
  classProgress: row.class_progress || {},
});

const studentToSupabase = (data: Partial<Student> & { newParentName?: string; newParentPhone?: string; newParentId?: string }): Row => removeUndefined({
  code: data.code,
  full_name: data.fullName,
  dob: data.dob || null,
  gender: data.gender,
  phone: data.phone,
  parent_id: data.newParentId || data.parentId,
  parent_name: data.newParentName || data.parentName,
  parent_phone: data.newParentPhone || data.parentPhone,
  status: data.status,
  branch: data.branch,
  class_id: data.classId,
  class_name: data.className || data.class,
  class_ids: data.classIds,
  registered_sessions: data.registeredSessions,
  attended_sessions: data.attendedSessions,
  remaining_sessions: data.remainingSessions,
  legacy_attended_sessions: data.legacyAttendedSessions,
  makeup_sessions_attended: data.makeupSessionsAttended,
  start_session_number: data.startSessionNumber,
  enrollment_date: data.enrollmentDate || null,
  start_date: data.startDate || null,
  expected_end_date: data.expectedEndDate || null,
  reserve_date: data.reserveDate || null,
  reserve_note: data.reserveNote,
  reserve_sessions: data.reserveSessions,
  dropout_reason: data.dropoutReason,
  dropout_date: data.dropoutDate || null,
  bad_debt: data.badDebt,
  bad_debt_sessions: data.badDebtSessions,
  bad_debt_amount: data.badDebtAmount,
  bad_debt_date: data.badDebtDate || null,
  bad_debt_note: data.badDebtNote,
  contract_debt: data.contractDebt,
  next_payment_date: data.nextPaymentDate || null,
  care_history: data.careHistory,
  class_progress: data.classProgress,
});

export const supabaseStudentService = {
  async getStudents(filters?: { status?: StudentStatus; classId?: string; searchTerm?: string; parentId?: string }): Promise<Student[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'status', filters?.status);
    addEq(params, 'class_id', filters?.classId);
    addEq(params, 'parent_id', filters?.parentId);
    addOrder(params, 'created_at', false);
    const rows = await supabaseRequest<Row[]>('students', params);
    let students = rows.map(mapStudentFromSupabase);
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      students = students.filter(s =>
        s.fullName?.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term) ||
        s.phone?.includes(term) ||
        s.parentName?.toLowerCase().includes(term)
      );
    }
    return students;
  },

  async getStudentById(id: string): Promise<Student | null> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'id', id);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('students', params);
    return rows[0] ? mapStudentFromSupabase(rows[0]) : null;
  },

  async createStudent(data: Omit<Student, 'id'> & { newParentName?: string; newParentPhone?: string }): Promise<string> {
    const rows = await supabaseRequest<Row[]>('students', undefined, {
      method: 'POST',
      body: JSON.stringify(studentToSupabase(data)),
    });
    return rows[0].id;
  },

  async updateStudent(id: string, updates: Partial<Student> & { newParentId?: string }): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<Row[]>('students', params, {
      method: 'PATCH',
      body: JSON.stringify(studentToSupabase(updates)),
    });
  },

  async deleteStudent(id: string): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<null>('students', params, { method: 'DELETE' });
  },
};

export const mapSessionFromSupabase = (row: Row): ClassSession => ({
  id: row.id,
  classId: row.class_id,
  className: row.class_name,
  sessionNumber: row.session_number,
  date: toDate(row.session_date),
  dayOfWeek: row.day_of_week || '',
  time: toTimeLabel(row.time_start, row.time_end, row.time_label),
  room: row.room || undefined,
  teacherId: row.teacher_id || undefined,
  teacherName: row.teacher_name || undefined,
  status: row.status || 'Chưa học',
  attendanceId: row.attendance_id || undefined,
  holidayId: row.holiday_id || undefined,
  holidayName: row.holiday_name || undefined,
  note: row.note || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sessionToSupabase = (data: Partial<ClassSession>): Row => removeUndefined({
  class_id: data.classId,
  class_name: data.className,
  session_number: data.sessionNumber,
  session_date: data.date,
  day_of_week: data.dayOfWeek,
  ...parseTimeLabel(data.time),
  room: data.room,
  teacher_id: data.teacherId,
  teacher_name: data.teacherName,
  status: data.status,
  attendance_id: data.attendanceId || null,
  holiday_id: data.holidayId,
  holiday_name: data.holidayName,
  note: data.note,
});

export const supabaseSessionService = {
  async saveSessions(sessions: ClassSession[]): Promise<number> {
    if (!sessions.length) return 0;
    await supabaseRequest<Row[]>('class_sessions', undefined, {
      method: 'POST',
      body: JSON.stringify(sessions.map(sessionToSupabase)),
    });
    return sessions.length;
  },

  async getSessionsByClass(classId: string, options?: { status?: ClassSession['status']; fromDate?: string; toDate?: string; limit?: number }): Promise<ClassSession[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'class_id', classId);
    addOrder(params, 'session_date', true);
    const rows = await supabaseRequest<Row[]>('class_sessions', params);
    let sessions = rows.map(mapSessionFromSupabase).filter(s => (s.sessionNumber || 0) > 0);
    if (options?.status) sessions = sessions.filter(s => s.status === options.status);
    if (options?.fromDate) sessions = sessions.filter(s => s.date >= options.fromDate!);
    if (options?.toDate) sessions = sessions.filter(s => s.date <= options.toDate!);
    if (options?.limit) sessions = sessions.slice(0, options.limit);
    return sortByDate(sessions);
  },

  async getAllPendingSessions(options?: { classIds?: string[]; fromDate?: string; toDate?: string }): Promise<ClassSession[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'status', 'Chưa học');
    addGte(params, 'session_date', options?.fromDate);
    addOrder(params, 'session_date', true);
    const rows = await supabaseRequest<Row[]>('class_sessions', params);
    let sessions = rows.map(mapSessionFromSupabase);
    if (options?.classIds?.length) sessions = sessions.filter(s => options.classIds!.includes(s.classId));
    if (options?.toDate) sessions = sessions.filter(s => s.date <= options.toDate!);
    return sortByDate(sessions);
  },

  async updateSessionStatus(sessionId: string, status: ClassSession['status'], attendanceId?: string): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', sessionId);
    await supabaseRequest<Row[]>('class_sessions', params, {
      method: 'PATCH',
      body: JSON.stringify({ status, attendance_id: attendanceId || null }),
    });
  },

  async deleteSessionsByClass(classId: string): Promise<number> {
    const existing = await this.getSessionsByClass(classId);
    const params = new URLSearchParams();
    addEq(params, 'class_id', classId);
    await supabaseRequest<null>('class_sessions', params, { method: 'DELETE' });
    return existing.length;
  },

  async getSessionByClassAndDate(classId: string, date: string): Promise<ClassSession | null> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'class_id', classId);
    addEq(params, 'session_date', date);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('class_sessions', params);
    return rows[0] ? mapSessionFromSupabase(rows[0]) : null;
  },

  async addMakeupSession(classData: { id: string; name: string; teacherId?: string; teacherName?: string; room?: string }, session: Omit<ClassSession, 'id'>): Promise<string> {
    const rows = await supabaseRequest<Row[]>('class_sessions', undefined, {
      method: 'POST',
      body: JSON.stringify(sessionToSupabase({
        ...session,
        classId: classData.id,
        className: classData.name,
        teacherId: classData.teacherId,
        teacherName: classData.teacherName,
        room: classData.room,
      })),
    });
    return rows[0].id;
  },

  async renumberSessionsByDate(classId: string): Promise<number> {
    const sessions = await this.getSessionsByClass(classId);
    let updates = 0;
    for (const [index, session] of sessions.entries()) {
      const correctNumber = index + 1;
      if (session.id && session.sessionNumber !== correctNumber) {
        const params = new URLSearchParams();
        addEq(params, 'id', session.id);
        await supabaseRequest<Row[]>('class_sessions', params, {
          method: 'PATCH',
          body: JSON.stringify({ session_number: correctNumber }),
        });
        updates++;
      }
    }
    return updates;
  },
};

export const mapAttendanceFromSupabase = (row: Row): AttendanceRecord => ({
  id: row.id,
  classId: row.class_id,
  className: row.class_name,
  date: toDate(row.attendance_date),
  sessionNumber: row.session_number ?? null,
  sessionId: row.session_id ?? null,
  totalStudents: row.total_students ?? 0,
  present: row.present ?? 0,
  absent: row.absent ?? 0,
  reserved: row.reserved ?? 0,
  tutored: row.tutored ?? 0,
  status: row.status || 'Chưa điểm danh',
  attendanceType: row.attendance_type || 'session',
  holidayId: row.holiday_id || undefined,
  holidayName: row.holiday_name || undefined,
  createdBy: row.created_by || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const attendanceToSupabase = (data: Partial<AttendanceRecord>): Row => removeUndefined({
  class_id: data.classId,
  class_name: data.className?.trim(),
  attendance_date: data.date,
  session_number: data.sessionNumber ?? null,
  session_id: data.sessionId ?? null,
  total_students: data.totalStudents,
  present: data.present,
  absent: data.absent,
  reserved: data.reserved,
  tutored: data.tutored,
  status: data.status,
  attendance_type: data.attendanceType || 'session',
  holiday_id: data.holidayId,
  holiday_name: data.holidayName,
  created_by: data.createdBy,
});

export const mapStudentAttendanceFromSupabase = (row: Row): StudentAttendance => ({
  id: row.id,
  attendanceId: row.attendance_id,
  sessionId: row.session_id || undefined,
  studentId: row.student_id,
  studentName: row.student_name,
  studentCode: row.student_code,
  classId: row.class_id || undefined,
  className: row.class_name || undefined,
  date: toDate(row.attendance_date),
  sessionNumber: row.session_number ?? undefined,
  status: row.status,
  note: row.note || undefined,
  homeworkCompletion: row.homework_completion ?? undefined,
  testName: row.test_name || undefined,
  score: row.score ?? undefined,
  bonusPoints: row.bonus_points ?? undefined,
  punctuality: row.punctuality || undefined,
  isLate: row.is_late ?? false,
  attendanceType: row.attendance_type || 'session',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const studentAttendanceToSupabase = (data: Partial<StudentAttendance>): Row => removeUndefined({
  attendance_id: data.attendanceId,
  session_id: data.sessionId ?? null,
  student_id: data.studentId,
  student_name: data.studentName,
  student_code: data.studentCode,
  class_id: data.classId ?? null,
  class_name: data.className ?? null,
  attendance_date: data.date ?? null,
  session_number: data.sessionNumber ?? null,
  status: data.status,
  note: data.note,
  homework_completion: data.homeworkCompletion,
  test_name: data.testName,
  score: data.score,
  bonus_points: data.bonusPoints,
  punctuality: data.punctuality,
  is_late: data.isLate,
  attendance_type: data.attendanceType || 'session',
});

export const supabaseAttendanceService = {
  async createAttendanceRecord(data: Omit<AttendanceRecord, 'id'>): Promise<string> {
    const rows = await supabaseRequest<Row[]>('attendance_records', undefined, {
      method: 'POST',
      body: JSON.stringify(attendanceToSupabase(data)),
    });
    return rows[0].id;
  },

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'id', id);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('attendance_records', params);
    return rows[0] ? mapAttendanceFromSupabase(rows[0]) : null;
  },

  async getAttendanceRecords(filters?: { classId?: string; date?: string; startDate?: string; endDate?: string }): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'class_id', filters?.classId);
    addEq(params, 'attendance_date', filters?.date);
    addOrder(params, 'attendance_date', false);
    const rows = await supabaseRequest<Row[]>('attendance_records', params);
    let records = rows.map(mapAttendanceFromSupabase);
    if (filters?.startDate) records = records.filter(r => r.date >= filters.startDate!);
    if (filters?.endDate) records = records.filter(r => r.date <= filters.endDate!);
    return records;
  },

  async checkExistingAttendance(classId: string, date: string): Promise<AttendanceRecord | null> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'class_id', classId);
    addEq(params, 'attendance_date', date);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('attendance_records', params);
    return rows[0] ? mapAttendanceFromSupabase(rows[0]) : null;
  },

  async updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<Row[]>('attendance_records', params, {
      method: 'PATCH',
      body: JSON.stringify(attendanceToSupabase(data)),
    });
  },

  async deleteAttendanceRecord(id: string): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<null>('attendance_records', params, { method: 'DELETE' });
  },

  async saveStudentAttendance(
    attendanceId: string,
    students: Omit<StudentAttendance, 'id' | 'attendanceId'>[],
    classId?: string,
    className?: string,
    date?: string,
    sessionNumber?: number,
    sessionId?: string,
    attendanceType?: 'session' | 'makeup' | 'manual'
  ): Promise<Map<string, string>> {
    const deleteParams = new URLSearchParams();
    addEq(deleteParams, 'attendance_id', attendanceId);
    await supabaseRequest<null>('student_attendance', deleteParams, { method: 'DELETE' });

    if (!students.length) return new Map();

    const rows = await supabaseRequest<Row[]>('student_attendance', undefined, {
      method: 'POST',
      body: JSON.stringify(students.map(student => studentAttendanceToSupabase({
        ...student,
        attendanceId,
        classId,
        className,
        date,
        sessionNumber,
        sessionId,
        attendanceType,
      }))),
    });

    return new Map(rows.map(row => [row.student_id, row.id]));
  },

  async getStudentAttendance(attendanceId: string): Promise<StudentAttendance[]> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'attendance_id', attendanceId);
    const rows = await supabaseRequest<Row[]>('student_attendance', params);
    return rows.map(mapStudentAttendanceFromSupabase);
  },

  async findStudentAttendanceRecord(studentId: string, classId: string, date: string): Promise<{ id: string; status: AttendanceStatus } | null> {
    const params = new URLSearchParams();
    addSelect(params, 'id,status');
    addEq(params, 'student_id', studentId);
    addEq(params, 'class_id', classId);
    addEq(params, 'attendance_date', date);
    addLimit(params, 1);
    const rows = await supabaseRequest<Row[]>('student_attendance', params);
    return rows[0] ? { id: rows[0].id, status: rows[0].status } : null;
  },

  async updateStudentAttendanceStatus(id: string, status: AttendanceStatus): Promise<void> {
    const params = new URLSearchParams();
    addEq(params, 'id', id);
    await supabaseRequest<Row[]>('student_attendance', params, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async countStudentAttendedSessions(studentId: string, classId: string): Promise<number> {
    const params = new URLSearchParams();
    addSelect(params);
    addEq(params, 'student_id', studentId);
    addEq(params, 'class_id', classId);
    const rows = await supabaseRequest<Row[]>('student_attendance', params);
    return rows.filter(row => [AttendanceStatus.ON_TIME, AttendanceStatus.LATE, AttendanceStatus.TUTORED, 'Có mặt', 'Đến trễ'].includes(row.status)).length;
  },
};

