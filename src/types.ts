/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export enum Shift {
  MATUTINO = 'MATUTINO',
  VESPERTINO = 'VESPERTINO',
  NOTURNO = 'NOTURNO',
  SABADO = 'SÁBADO',
  EAD = 'EAD'
}

export enum CalendarEventType {
  CLOSING_S1 = 'CLOSING_S1',
  CLOSING_S2 = 'CLOSING_S2',
  DEFINITIVE_CLOSING = 'DEFINITIVE_CLOSING',
  HOLIDAY = 'HOLIDAY',
  EXAM = 'EXAM',
  INFO = 'INFO'
}

export interface User {
  id: string;
  name: string;
  username: string; // for login
  email: string;
  role: UserRole;
  password?: string;
  cpf?: string; // for teachers
  enrollment?: string; // matricula for students/teachers
  active: boolean;
  classId?: string; // student's active class section
  assignedJournals?: { classId: string, subjectId: string }[];
}

export interface Course {
  id: string;
  name: string;
  description: string;
}

export interface ClassSection {
  id: string;
  name: string;
  code?: string;
  courseId: string;
  shift: Shift;
  module: number;
  year: number;
  semester: number;
  closedS1: boolean;
  closedS2: boolean;
  closedDefinitive: boolean;
  isImported?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
  module: number;
  workload: number; // Carga Horária in hours
}

export interface GradeRecord {
  id: string;
  subjectId: string;
  classId: string;
  studentId: string;
  // S1 evaluations
  av1?: number | null;
  av2?: number | null;
  av3?: number | null;
  recS1?: number | null;
  s1: number; // S1 calculated
  // S2 evaluations
  av4?: number | null;
  av5?: number | null;
  av6?: number | null;
  recS2?: number | null;
  s2: number; // S2 calculated
  
  extra?: number | null; // EX
  conselho?: number | null; // CS
  afc?: number | null; // AFC (Avaliação Final de Competência)
  pf: number; // Pontuação Final calculated
  concept: string; // A, B, C, D, etc.
  result: 'APTO' | 'NÃO APTO' | 'F. NOTA' | 'REP. FALTAS' | 'Pendente';
  isHistoricalImport?: boolean;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  lessonsCount: number; // e.g. 2 or 4 lessons (aulas)
  teacherId: string;
  topic: string; // observações/conteúdo
  // Map of studentId -> 'P' (Presença) or 'F' (Falta)
  records: { [studentId: string]: 'P' | 'F' };
}

export interface ConceptRange {
  id: string;
  minGrade: number;
  maxGrade: number;
  letter: string;
  description: string; // e.g. Excelente, Bom, etc.
}

export interface Message {
  id: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string; // studentId, teacherId, or 'ALL_TEACHERS'
  content: string;
  date: string;
  attachmentUrl?: string;
  attachmentType?: 'audio' | 'pdf' | 'image';
  attachmentName?: string;
}

export interface AcademicNotification {
  id: string;
  userId: string;
  content: string;
  date: string;
  read: boolean;
}

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  description: string;
}

export interface SystemStats {
  teachersCount: number;
  studentsCount: number;
  classesCount: number;
  subjectsCount: number;
  journalsCount: number; // Total number of diários
  journalsClosed: number;
  journalsOpen: number;
  studentsApto: number;
  studentsNaoApto: number;
  overallApprovalRate: number; // percentage
  totalAbsences: number;
  pendingGradesCount: number;
}

export interface StudentDocument {
  id: string; // doc_studentId_documentName
  studentId: string;
  name: string;
  status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE';
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface DeclarationConfigs {
  escolaridade: { startDate: string; endDate: string };
  ctransp: { startDate: string; endDate: string };
}

export interface InternshipRecord {
  id: string;
  studentId: string;
  subjectName: string;
  workload: number;
  location: string;
  grade: number | null;
  updatedAt?: string;
}

