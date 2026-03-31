import { Student } from '@/types';

/**
 * StudentSessionData - Dữ liệu session đã được normalize
 * Trả về số buổi đăng ký, đã học (mới + cũ), và còn lại cho học sinh
 */
export interface StudentSessionData {
  registered: number;      // Số buổi đăng ký/đóng tiền
  registeredAll: number;   // Tổng số buổi đăng ký tất cả lớp
  attended: number;        // Số buổi đã học lớp hiện tại (hệ thống mới)
  attendedAll: number;     // Số buổi đã học tất cả lớp (hệ thống mới)
  legacyAttended: number;  // Số buổi đã học (hệ thống cũ)
  totalAttended: number;   // Tổng đã học dùng để hiển thị/tính còn lại
  includesLegacy: boolean; // Có cộng legacyAttended vào lớp hiện tại hay không
  remaining: number;       // Số buổi còn lại (âm = nợ)
}

/**
 * Lấy dữ liệu session của học sinh từ classProgress (ưu tiên) hoặc legacy fields (fallback)
 *
 * Flow:
 * 1. Nếu có classProgress[classId] → dùng dữ liệu từ đó
 * 2. Nếu không → fallback về registeredSessions/attendedSessions (legacy)
 * 3. Nếu student null → trả về zeros
 *
 * @param student - Student object (có thể null)
 * @returns StudentSessionData với registered, attended, legacyAttended, remaining
 *
 * @example
 * const { registered, attended, legacyAttended, remaining } = getStudentSessionData(student);
 * if (remaining < 0) showDebtWarning();
 */
export function getStudentSessionData(student: Student | null): StudentSessionData {
  if (!student) {
    return {
      registered: 0,
      registeredAll: 0,
      attended: 0,
      attendedAll: 0,
      legacyAttended: 0,
      totalAttended: 0,
      includesLegacy: false,
      remaining: 0
    };
  }

  const legacyAttended = student.legacyAttendedSessions || 0;
  const classId = student.classId;

  // Ưu tiên: đọc từ classProgress nếu classId valid và có data
  const progress = (classId && student.classProgress) ? student.classProgress[classId] : null;
  const progressValues = Object.values(student.classProgress || {});
  const registeredAllFromProgress = progressValues.reduce((sum, p: any) => sum + (p?.registeredSessions || 0), 0);
  const attendedAll = progressValues.reduce((sum, p: any) => sum + (p?.attendedSessions || 0), 0);

  if (progress) {
    const registered = progress.registeredSessions || 0;
    const attended = progress.attendedSessions || 0;
    const totalAttended = attendedAll + legacyAttended;
    return {
      registered,
      registeredAll: registeredAllFromProgress || registered,
      attended,
      attendedAll,
      legacyAttended,
      totalAttended,
      includesLegacy: true,
      // Còn lại vẫn theo lớp hiện tại để không phá nghiệp vụ lớp đang học
      remaining: registered - attended
    };
  }

  // Fallback: dùng legacy fields
  const registered = student.registeredSessions || 0;
  const attended = student.attendedSessions || 0;
  return {
    registered,
    registeredAll: registered,
    attended,
    attendedAll: attended,
    legacyAttended,
    totalAttended: attended + legacyAttended,
    includesLegacy: true,
    remaining: registered - attended - legacyAttended
  };
}
