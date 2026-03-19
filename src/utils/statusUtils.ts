/**
 * Status Utilities
 * Status normalization and display helpers
 */

import { StudentStatus, ClassStatus } from '../../types';

/**
 * Student status mapping for legacy data compatibility
 */
const STUDENT_STATUS_MAP: Record<string, StudentStatus> = {
  // Vietnamese values
  'Đang học': StudentStatus.ACTIVE,
  'Nợ phí': StudentStatus.DEBT,
  'Nợ hợp đồng': StudentStatus.CONTRACT_DEBT,
  'Bảo lưu': StudentStatus.RESERVED,
  'Nghỉ học': StudentStatus.DROPPED,
  'Học thử': StudentStatus.TRIAL,
  'Đã học hết phí': StudentStatus.EXPIRED_FEE,
  // English legacy values
  'active': StudentStatus.ACTIVE,
  'debt': StudentStatus.DEBT,
  'reserved': StudentStatus.RESERVED,
  'dropped': StudentStatus.DROPPED,
  'trial': StudentStatus.TRIAL
};

/**
 * Normalize student status from various formats
 */
export const normalizeStudentStatus = (status: string | StudentStatus | undefined): StudentStatus => {
  if (!status) return StudentStatus.ACTIVE;
  const raw = String(status);
  const normalized = raw
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\s+/g, ' ')
    .trim();

  if (Object.values(StudentStatus).includes(normalized as StudentStatus)) {
    return normalized as StudentStatus;
  }
  // First try Vietnamese/enum exact match after normalization, then fall back to lower-case keys.
  return STUDENT_STATUS_MAP[normalized] || STUDENT_STATUS_MAP[normalized.toLowerCase()] || StudentStatus.ACTIVE;
};

/**
 * Get student status display color (Tailwind classes)
 */
export const getStudentStatusColor = (status: StudentStatus): string => {
  const colors: Record<StudentStatus, string> = {
    [StudentStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [StudentStatus.DEBT]: 'bg-red-100 text-red-800',
    [StudentStatus.CONTRACT_DEBT]: 'bg-orange-100 text-orange-800',
    [StudentStatus.RESERVED]: 'bg-yellow-100 text-yellow-800',
    [StudentStatus.DROPPED]: 'bg-gray-100 text-gray-800',
    [StudentStatus.TRIAL]: 'bg-blue-100 text-blue-800',
    [StudentStatus.EXPIRED_FEE]: 'bg-purple-100 text-purple-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get class status display color (Tailwind classes)
 */
export const getClassStatusColor = (status: ClassStatus): string => {
  const colors: Record<ClassStatus, string> = {
    [ClassStatus.STUDYING]: 'bg-green-100 text-green-800',
    [ClassStatus.FINISHED]: 'bg-gray-100 text-gray-800',
    [ClassStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
    [ClassStatus.PENDING]: 'bg-blue-100 text-blue-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get status badge text
 */
export const getStatusLabel = (status: StudentStatus | ClassStatus): string => {
  return status;
};
