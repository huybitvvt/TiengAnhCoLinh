const path = require('node:path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

const admin = require('firebase-admin');

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'demo-briskyedu';

admin.initializeApp({ projectId });

const auth = admin.auth();
const db = admin.firestore();

const nowIso = () => new Date().toISOString();

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const parseScheduleDays = (schedule) => {
  const lower = schedule.toLowerCase();
  const days = new Set();

  if (lower.includes('chủ nhật') || lower.includes('cn')) days.add(0);

  const thuMatches = schedule.matchAll(/Th[ứử]\s*(\d)/gi);
  for (const match of thuMatches) {
    const day = Number(match[1]);
    if (day >= 2 && day <= 7) days.add(day === 7 ? 6 : day - 1);
  }

  const tMatches = schedule.matchAll(/\bT([2-7])\b/gi);
  for (const match of tMatches) {
    const day = Number(match[1]);
    days.add(day === 7 ? 6 : day - 1);
  }

  const numberMatches = schedule.match(/\b([2-7])\b/g);
  if (numberMatches) {
    for (const raw of numberMatches) {
      const day = Number(raw);
      days.add(day === 7 ? 6 : day - 1);
    }
  }

  return [...days].sort();
};

const parseScheduleTime = (schedule) => {
  const match = schedule.match(/(\d{1,2})[h:]?(\d{0,2})?\s*[-–]\s*(\d{1,2})[h:]?(\d{0,2})?/);
  if (!match) return undefined;

  const startHour = match[1].padStart(2, '0');
  const startMin = (match[2] || '00').padStart(2, '0');
  const endHour = match[3].padStart(2, '0');
  const endMin = (match[4] || '00').padStart(2, '0');
  return `${startHour}:${startMin}-${endHour}:${endMin}`;
};

const generateSessions = (classData, fromDate, maxSessions = 24) => {
  const scheduleDays = parseScheduleDays(classData.schedule || '');
  const time = parseScheduleTime(classData.schedule || '');
  const sessions = [];
  let cursor = new Date(fromDate);
  let sessionNumber = 1;

  while (sessions.length < maxSessions) {
    const day = cursor.getDay();
    if (scheduleDays.includes(day)) {
      sessions.push({
        classId: classData.id,
        className: classData.name,
        sessionNumber,
        date: formatDate(cursor),
        dayOfWeek: dayNames[day],
        time,
        room: classData.room,
        teacherId: classData.teacherId,
        teacherName: classData.teacher,
        status: 'Chưa học',
        createdAt: nowIso(),
      });
      sessionNumber += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return sessions;
};

const deleteCollection = async (collectionName) => {
  const ref = db.collection(collectionName);
  let total = 0;

  while (true) {
    const snap = await ref.limit(400).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
  }

  return total;
};

const setDocs = async (collectionName, rows) => {
  const batch = db.batch();
  rows.forEach((row) => {
    const { id, ...data } = row;
    batch.set(db.collection(collectionName).doc(id), data);
  });
  await batch.commit();
};

const seed = async () => {
  console.log(`Using Firebase emulators for project ${projectId}`);
  console.log(`Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

  const collections = [
    'attendance',
    'studentAttendance',
    'tutoring',
    'classSessions',
    'students',
    'parents',
    'classes',
    'staff',
    'centers',
    'rooms',
    'curriculums',
    'holidays',
  ];

  for (const collectionName of collections) {
    const deleted = await deleteCollection(collectionName);
    if (deleted) console.log(`Cleared ${collectionName}: ${deleted}`);
  }

  let adminUser;
  try {
    adminUser = await auth.getUserByEmail('admin@brisky.edu.vn');
    adminUser = await auth.updateUser(adminUser.uid, {
      emailVerified: true,
      password: '123456',
      displayName: 'Admin Brisky',
      disabled: false,
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    adminUser = await auth.createUser({
      email: 'admin@brisky.edu.vn',
      emailVerified: true,
      password: '123456',
      displayName: 'Admin Brisky',
      disabled: false,
    });
  }

  const centerName = 'Brisky Tân Tây Đô';
  const teacherLanId = 'staff-teacher-lan';
  const teacherHungId = 'staff-teacher-hung';
  const assistantHuongId = 'staff-assistant-huong';

  await setDocs('staff', [
    {
      id: adminUser.uid,
      name: 'Admin Brisky',
      code: 'ADM001',
      role: 'Quản trị viên',
      roles: ['Quản trị viên'],
      department: 'Điều Hành',
      position: 'Quản trị viên',
      phone: '0900000000',
      email: 'admin@brisky.edu.vn',
      status: 'Active',
      branch: centerName,
      createdAt: nowIso(),
    },
    {
      id: teacherLanId,
      name: 'Nguyễn Thị Lan',
      code: 'GV001',
      role: 'GV Việt',
      roles: ['GV Việt'],
      department: 'Đào Tạo',
      position: 'GV Việt',
      phone: '0901111111',
      email: 'lan@brisky.edu.vn',
      status: 'Active',
      branch: centerName,
      createdAt: nowIso(),
    },
    {
      id: teacherHungId,
      name: 'Trần Văn Hùng',
      code: 'GV002',
      role: 'GV Việt',
      roles: ['GV Việt'],
      department: 'Đào Tạo',
      position: 'GV Việt',
      phone: '0902222222',
      email: 'hung@brisky.edu.vn',
      status: 'Active',
      branch: centerName,
      createdAt: nowIso(),
    },
    {
      id: assistantHuongId,
      name: 'Lê Thị Hương',
      code: 'TG001',
      role: 'Trợ giảng',
      roles: ['Trợ giảng'],
      department: 'Đào Tạo',
      position: 'Trợ giảng',
      phone: '0903333333',
      email: 'huong@brisky.edu.vn',
      status: 'Active',
      branch: centerName,
      createdAt: nowIso(),
    },
  ]);

  await setDocs('centers', [
    {
      id: 'center-ttd',
      name: centerName,
      code: 'TTD',
      address: 'Tân Tây Đô, Đan Phượng, Hà Nội',
      phone: '0241234567',
      status: 'Active',
      isMain: true,
      createdAt: nowIso(),
    },
  ]);

  await db.collection('settings').doc('center').set({
    name: 'Brisky English Center',
    code: 'BRISKY',
    address: 'Tân Tây Đô, Đan Phượng, Hà Nội',
    phone: '0241234567',
    email: 'info@brisky.edu.vn',
    timezone: 'Asia/Ho_Chi_Minh',
    updatedAt: nowIso(),
  });

  await setDocs('rooms', [
    {
      id: 'room-a101',
      name: 'Phòng A101',
      type: 'Phòng học',
      capacity: 16,
      status: 'Hoạt động',
      branch: centerName,
      createdAt: nowIso(),
    },
    {
      id: 'room-a102',
      name: 'Phòng A102',
      type: 'Phòng học',
      capacity: 14,
      status: 'Hoạt động',
      branch: centerName,
      createdAt: nowIso(),
    },
  ]);

  await setDocs('curriculums', [
    {
      id: 'curr-starter',
      name: 'Academy Starter 1',
      level: 'Beginner',
      sessions: 36,
      tuition: 3500000,
      status: 'Active',
      createdAt: nowIso(),
    },
    {
      id: 'curr-elementary',
      name: 'Academy Elementary 1',
      level: 'Elementary',
      sessions: 36,
      tuition: 4000000,
      status: 'Active',
      createdAt: nowIso(),
    },
  ]);

  const today = new Date();
  const startDate = formatDate(addDays(today, -14));
  const endDate = formatDate(addDays(today, 75));

  const classes = [
    {
      id: 'class-starter-1a',
      name: 'Starter 1A',
      status: 'Đang học',
      curriculum: 'Academy Starter 1',
      curriculumId: 'curr-starter',
      ageGroup: '8-10 tuổi',
      progress: '0/36 Buổi',
      totalSessions: 36,
      teacher: 'Nguyễn Thị Lan',
      teacherId: teacherLanId,
      assistant: 'Lê Thị Hương',
      assistantId: assistantHuongId,
      studentsCount: 4,
      currentStudents: 4,
      schedule: 'Thứ 2, 4, 6 (17h30-19h00)',
      room: 'Phòng A101',
      branch: centerName,
      startDate,
      endDate,
      createdAt: nowIso(),
    },
    {
      id: 'class-elementary-1a',
      name: 'Elementary 1A',
      status: 'Đang học',
      curriculum: 'Academy Elementary 1',
      curriculumId: 'curr-elementary',
      ageGroup: '10-12 tuổi',
      progress: '0/36 Buổi',
      totalSessions: 36,
      teacher: 'Trần Văn Hùng',
      teacherId: teacherHungId,
      assistant: 'Lê Thị Hương',
      assistantId: assistantHuongId,
      studentsCount: 3,
      currentStudents: 3,
      schedule: 'Thứ 3, 5, 7 (18h00-19h30)',
      room: 'Phòng A102',
      branch: centerName,
      startDate,
      endDate,
      createdAt: nowIso(),
    },
  ];

  await setDocs('classes', classes);

  const parents = [
    { id: 'parent-001', name: 'Nguyễn Văn Tùng', phone: '0911000001', email: 'tung@example.com', createdAt: nowIso() },
    { id: 'parent-002', name: 'Trần Thị Hồng', phone: '0911000002', email: 'hong@example.com', createdAt: nowIso() },
    { id: 'parent-003', name: 'Lê Văn Đức', phone: '0911000003', email: 'duc@example.com', createdAt: nowIso() },
    { id: 'parent-004', name: 'Phạm Thị Nga', phone: '0911000004', email: 'nga@example.com', createdAt: nowIso() },
  ];

  await setDocs('parents', parents);

  const students = [
    ['student-001', 'HV001', 'Nguyễn Minh An', 'Nam', '2015-03-15', 'class-starter-1a', 'Starter 1A', 'parent-001', parents[0]],
    ['student-002', 'HV002', 'Trần Bảo Ngọc', 'Nữ', '2015-07-22', 'class-starter-1a', 'Starter 1A', 'parent-002', parents[1]],
    ['student-003', 'HV003', 'Lê Hoàng Nam', 'Nam', '2014-11-08', 'class-starter-1a', 'Starter 1A', 'parent-003', parents[2]],
    ['student-004', 'HV004', 'Phạm Thu Hà', 'Nữ', '2014-05-20', 'class-starter-1a', 'Starter 1A', 'parent-004', parents[3]],
    ['student-005', 'HV005', 'Hoàng Gia Bảo', 'Nam', '2013-09-12', 'class-elementary-1a', 'Elementary 1A', 'parent-001', parents[0]],
    ['student-006', 'HV006', 'Vũ Khánh Linh', 'Nữ', '2013-12-25', 'class-elementary-1a', 'Elementary 1A', 'parent-002', parents[1]],
    ['student-007', 'HV007', 'Đặng Quốc Huy', 'Nam', '2012-04-18', 'class-elementary-1a', 'Elementary 1A', 'parent-003', parents[2]],
  ].map(([id, code, fullName, gender, dob, classId, className, parentId, parent]) => ({
    id,
    code,
    fullName,
    gender,
    dob,
    phone: parent.phone,
    parentId,
    parentName: parent.name,
    parentPhone: parent.phone,
    status: 'Đang học',
    careHistory: [],
    branch: centerName,
    class: className,
    className,
    classId,
    classIds: [classId],
    registeredSessions: 36,
    attendedSessions: 0,
    remainingSessions: 36,
    classProgress: {
      [classId]: {
        registeredSessions: 36,
        attendedSessions: 0,
        absentSessions: 0,
        makeupOwed: 0,
        makeupDone: 0,
        reservedSessions: 0,
      },
    },
    enrollmentDate: startDate,
    startDate,
    createdAt: nowIso(),
  }));

  await setDocs('students', students);

  const sessions = classes.flatMap((classData) => generateSessions(classData, addDays(today, -7), 24));
  await setDocs('classSessions', sessions.map((session, index) => ({
    id: `session-${String(index + 1).padStart(3, '0')}`,
    ...session,
  })));

  const firstClass = classes[0];
  const firstSession = sessions.find((session) => session.classId === firstClass.id);
  if (firstSession) {
    const attendanceId = 'attendance-demo-001';
    const classStudents = students.filter((student) => student.classId === firstClass.id);
    await db.collection('attendance').doc(attendanceId).set({
      classId: firstClass.id,
      className: firstClass.name,
      date: firstSession.date,
      sessionNumber: firstSession.sessionNumber,
      sessionId: 'session-001',
      totalStudents: classStudents.length,
      present: classStudents.length - 1,
      absent: 1,
      reserved: 0,
      tutored: 0,
      status: 'Đã điểm danh',
      attendanceType: 'session',
      createdBy: adminUser.uid,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    await Promise.all(classStudents.map((student, index) => db.collection('studentAttendance').doc(`student-attendance-${index + 1}`).set({
      attendanceId,
      sessionId: 'session-001',
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      classId: firstClass.id,
      className: firstClass.name,
      date: firstSession.date,
      sessionNumber: firstSession.sessionNumber,
      status: index === classStudents.length - 1 ? 'Vắng' : 'Đúng giờ',
      punctuality: index === classStudents.length - 1 ? '' : 'onTime',
      attendanceType: 'session',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })));
  }

  console.log('\nSeed completed.');
  console.log('Login: admin@brisky.edu.vn / 123456');
  console.log('Open schedule: http://127.0.0.1:5173/#/training/schedule');
  console.log('Open attendance: http://127.0.0.1:5173/#/training/attendance');
};

seed().catch((error) => {
  console.error('\nSeed failed.');
  console.error(error.message || error);
  console.error('\nMake sure Firebase emulators are running: npm.cmd run emulators');
  process.exit(1);
});
