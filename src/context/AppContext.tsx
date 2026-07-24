/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, UserRole, Course, ClassSection, Subject, GradeRecord, 
  AttendanceSession, ConceptRange, AcademicCalendarEvent, Message, 
  AcademicNotification, Shift, SystemStats, StudentDocument, DeclarationConfigs,
  InternshipRecord
} from '../types';
import { 
  initialCourses, initialConceptRanges, initialUsers, 
  initialClasses, initialSubjects, initialGrades, 
  generateInitialAttendance, initialCalendarEvents, getDemoDataToLoad
} from '../data/initialData';
import { safeLocalStorage } from '../lib/safeStorage';
import { 
  saveStateToCloud, loadStateFromCloud, SystemStatePayload,
  uploadBackupToStorage, listBackupsFromStorage, deleteBackupFromStorage, StorageBackupFile,
  auth, db, isPermissionError
} from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';

function safeJsonParse<T>(savedValue: string | null, fallback: T): T {
  if (!savedValue) return fallback;
  try {
    if (savedValue === 'undefined' || savedValue === 'null') return fallback;
    const parsed = JSON.parse(savedValue);
    
    // Type defense: if fallback is an array, ensure parsed is an array
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn(`[safeJsonParse] Expected array for stored state but got:`, typeof parsed);
      return fallback;
    }
    
    // Type defense: if fallback is an object (non-null, non-array), ensure parsed matches
    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.warn(`[safeJsonParse] Expected object for stored state but got:`, typeof parsed);
        return fallback;
      }
    }
    
    return parsed as T;
  } catch (e) {
    console.warn(`[safeJsonParse] Error parsing JSON value:`, e);
    return fallback;
  }
}

export interface BackupScheduleConfig {
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastBackupTime: string | null;
  nextBackupTime: string | null;
  hour: string; // e.g. "02:00"
}

export interface HistoricalImportSummary {
  coursesCreated: number;
  classesCreated: number;
  subjectsCreated: number;
  studentsCreated: number;
  studentsRecognized: number;
  gradesImported: number;
}

export interface DataRepairSummary {
  classesMerged: number;
  subjectsMerged: number;
  studentsMerged: number;
  gradesReattached: number;
  details: string[];
}

interface AppContextType {
  isLoading: boolean;
  currentUser: User | null;
  users: User[];
  courses: Course[];
  classes: ClassSection[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceSession[];
  conceptRanges: ConceptRange[];
  calendarEvents: AcademicCalendarEvent[];
  messages: Message[];
  notifications: AcademicNotification[];
  activeClassId: string | null;
  activeSubjectId: string | null;
  
  // Automated closing config
  autoLockEnabled: boolean;
  setAutoLockEnabled: (enabled: boolean) => void;
  simulatedDate: string;
  setSimulatedDate: (date: string) => void;
  updateCalendarEventDate: (id: string, date: string) => void;
  isClassS1Locked: (cl: ClassSection) => boolean;
  isClassS2Locked: (cl: ClassSection) => boolean;
  isClassDefinitiveLocked: (cl: ClassSection) => boolean;
  
  // Period/Semester Management
  currentPeriod: string;
  periods: string[];
  setCurrentPeriod: (period: string) => void;
  addPeriod: (period: string) => void;
  
  // Admin DB controls
  wipeAllData: () => void;
  loadDemoData: () => void;
  
  // Auth
  login: (username: string, cpfOrEnrollment: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  updatePassword: (userId: string, newPass: string) => Promise<void>;
  recoverPassword: (email: string) => Promise<string | null>;
  
  // Set Active
  setActiveClassId: (id: string | null) => void;
  setActiveSubjectId: (id: string | null) => void;

  // DB Mutators
  addCourse: (course: Course) => void;
  addClass: (cls: ClassSection) => void;
  updateClass: (id: string, updates: Partial<ClassSection>) => void;
  deleteClass: (id: string) => void;
  addSubject: (sub: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  unifyDuplicateStudents: (principalId: string, duplicateIds: string[]) => void;
  unifyDuplicateSubjects: (correctSubjectId: string, duplicateSubjectIds: string[]) => void;
  syncSubjectsWithOfficialCurriculum: () => {
    renamed: { original: string; official: string; id: string }[];
    unified: { original: string; kept: string; keptId: string; deletedId: string }[];
  };
  updateGrade: (id: string, updates: Partial<GradeRecord>) => void;
  updateConceptRanges: (ranges: ConceptRange[]) => void;
  
  // Attendance
  saveAttendanceSession: (session: AttendanceSession) => void;
  addAttendanceSession: (session: Omit<AttendanceSession, 'id'>) => void;
  directAbsences: Record<string, number>;
  updateStudentAbsences: (studentId: string, subjectId: string, classId: string, total: number) => void;
  
  // Actions
  toggleJournalStatus: (classId: string, type: 'S1' | 'S2' | 'Definitive') => void;
  sendMessage: (
    senderName: string, 
    senderRole: UserRole, 
    recipientId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: 'audio' | 'pdf' | 'image',
    attachmentName?: string
  ) => void;
  addNotification: (userId: string, content: string) => void;
  clearNotifications: (userId: string) => void;
  
  // Helpers
  getStudentAbsences: (studentId: string, subjectId: string, classId?: string) => { total: number, frequency: number };
  getStudentAttendanceGrid: (studentId: string) => { [subjectId: string]: { total: number, frequency: number } };
  
  // Bulk imports
  importStudents: (studentList: { name: string, enrollment: string, email: string }[], targetClassId: string) => void;
  importSubjects: (subjectList: { name: string, workload: number }[], courseId: string, module: number) => void;
  importConcepts: (conceptList: ConceptRange[]) => void;
  importHistoricalData: (data: any, targetPeriod?: string) => HistoricalImportSummary;
  repairDuplicateImports: () => DataRepairSummary;
  undoHistoricalImports: () => { removedClassesCount: number; removedStudentsCount: number; removedGradesCount: number };

  // Security and Backups
  securityLogs: any[];
  cloudBackupStatus: 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'quota_exceeded';
  lastCloudBackupTime: string | null;
  addSecurityLog: (eventType: string, details: string, severity?: 'low' | 'medium' | 'high') => void;
  triggerLocalBackup: () => void;
  triggerCloudBackup: () => Promise<boolean>;
  restoreFromBackup: (jsonString: string) => { success: boolean; message: string };
  restoreFromCloud: () => Promise<{ success: boolean; message: string }>;
  failedAttemptsMap: Record<string, { count: number; lockoutUntil: number | null }>;
  resetFailedAttempts: (username: string) => void;

  // Storage Backups & Scheduling
  backupSchedule: BackupScheduleConfig;
  updateBackupSchedule: (config: Partial<BackupScheduleConfig>) => Promise<void>;
  storageBackups: StorageBackupFile[];
  isLoadingStorageBackups: boolean;
  fetchStorageBackups: () => Promise<void>;
  triggerStorageBackup: () => Promise<string | null>;
  deleteStorageBackup: (filename: string) => Promise<boolean>;

  declarationConfigs: DeclarationConfigs;
  studentDocuments: StudentDocument[];
  internships: InternshipRecord[];
  updateDeclarationConfig: (type: 'escolaridade' | 'ctransp', fields: { startDate: string, endDate: string }) => void;
  updateStudentDocumentStatus: (id: string, status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE', fileUrl?: string, fileName?: string) => void;
  transferStudent: (studentId: string, targetClassId: string) => void;
  updateInternshipRecord: (studentId: string, subjectName: string, workload: number, location: string, grade: number | null) => void;
  adminPasswordResetDone: boolean;
  resetAdminPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  unlockAdminReset: () => void;
}

export function getRequiredDocsForStudent(courseName?: string): string[] {
  const base = [
    'RG',
    'CPF',
    'Título de Eleitor',
    'Certidão de Nascimento ou Casamento',
    'Comprovante de Endereço',
    'Foto 3x4',
    'Diploma de Ensino Médio',
    'Histórico do Ensino Médio'
  ];
  if (!courseName) return base;
  const nameLower = courseName.toLowerCase();
  if (nameLower.includes('instrumentação') || nameLower.includes('cirúrgica')) {
    return [...base, 'Diploma do Curso Técnico em Enfermagem', 'Histórico do Curso Técnico em Enfermagem'];
  }
  if (nameLower.includes('graduação') && nameLower.includes('enfermagem')) {
    return [...base, 'Diploma da Graduação em Enfermagem'];
  }
  return base;
}

export const officialCurriculum = [
  {
    courseName: "TÉCNICO EM ENFERMAGEM",
    modules: {
      1: [
        "Anatomia e Fisiologia Humana",
        "Biossegurança nas Ações de Saúde",
        "Introdução à Enfermagem",
        "Microbiologia e Parasitologia",
        "Noções de Farmacologia",
        "Nutrição",
        "Primeiros Socorros",
        "Estágio Supervisionado"
      ],
      2: [
        "Enfermagem em Centro Cirúrgico",
        "Enfermagem em Clínica Cirúrgica",
        "Enfermagem em Clínica Médica",
        "Enfermagem em Centro de Material e Esterilização",
        "Enfermagem em Obstetrícia",
        "Enfermagem em Pediatria",
        "Enfermagem em Saúde Mental",
        "Ética e Legislação Profissional",
        "Psicologia do Trabalho em Saúde",
        "Saúde Coletiva",
        "Estágio Supervisionado"
      ],
      3: [
        "Cardiologia",
        "Dietoterapia",
        "Enfermagem em Unidade de Terapia Intensiva",
        "Enfermagem em Urgência e Emergência",
        "Introdução ao Trabalho Científico",
        "Fundamentos de Informática",
        "Gastroenterologia",
        "Geriatria",
        "Nefrologia",
        "Neurologia",
        "Queimaduras Graves",
        "Estágio Supervisionado"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM ENFERMAGEM EAD",
    modules: {
      1: [
        "Anatomia e Fisiologia Humana",
        "Microbiologia e Parasitologia",
        "Biossegurança nas Ações de Saúde",
        "Saúde Coletiva I",
        "Nutrição",
        "Fundamentos de Enfermagem"
      ],
      2: [
        "Centro de Material e Esterilização",
        "Ética e Legislação",
        "Psicologia do Trabalho em Saúde",
        "Gestão e Descarte de Resíduos em Saúde",
        "Assist. de Enfermagem Em Clínica Cirúrgica",
        "Assist. de Enfermagem em Clínica Médica",
        "Saúde Coletiva II",
        "Assistência de Enfermagem à Criança e à Mulher"
      ],
      3: [
        "Assist. de Enf. em Urgências e Emergências",
        "Assistência de Enfermagem em Saúde Mental",
        "Assist. de Enf. a Pacientes em Estado Grave",
        "Cardiologia",
        "Dietoterapia",
        "Gastroenterologia",
        "Geriatria",
        "Nefrologia",
        "Neurologia",
        "Projeto Integrador Multidisciplinar"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM RADIOLOGIA",
    modules: {
      1: [
        "Química Aplicada à Radiologia",
        "Biossegurança nas Ações de Saúde",
        "Anatomia I",
        "Fisiologia",
        "Primeiros Socorros",
        "Patologia Aplicada à Radiologia I",
        "Técnicas Radiográficas I",
        "Psicologia do Trabalho em Saúde",
        "Estágio Supervisionado"
      ],
      2: [
        "Anatomia II",
        "Patologia Aplicada à Radiologia II",
        "Física das Radiações",
        "Equipamentos e Acessórios Radiológicos",
        "Ética e Legislação",
        "Efeitos Biológicos dos Meios de Contraste e das Radiações Ionizantes",
        "Técnicas Radiográficas II",
        "Proteção e Higiene das Radiações I",
        "Estágio Supervisionado"
      ],
      3: [
        "Mamografia",
        "Densitometria Óssea",
        "Radiologia Buco-Maxilo-Facial",
        "Noções de Radioterapia",
        "Tomografia Computadorizada",
        "Ressonância Magnética Nuclear",
        "Proteção e Higiene das Radiações II",
        "Saúde Coletiva",
        "Gestão e Descarte de Resíduos Radiológicos",
        "Introdução ao Trabalho Científico",
        "Noções de Informática",
        "Estágio Supervisionado"
      ]
    }
  },
  {
    courseName: "TÉCNICO EM SEGURANÇA DO TRABALHO",
    modules: {
      1: [
        "Segurança e Saúde Ocupacional I",
        "Desenho Técnico",
        "Psicologia Organizacional e do Trabalho",
        "Legislação Trabalhista e Previdenciária",
        "Expressão e Comunicação",
        "Informática Básica",
        "Relações Humanas no Trabalho",
        "Primeiros Socorros"
      ],
      2: [
        "Ergonomia do Trabalho",
        "Legislação e Normas Técnicas I",
        "Segurança e Saúde Ocupacional II",
        "Epidemiologia e Toxicologia",
        "Higiene e Saneamento no Trabalho",
        "Prevenção e Combate a Catástrofes e Sinistros"
      ],
      3: [
        "Legislação e Normas Técnicas II",
        "Educação Ambiental",
        "Programas Prevencionistas",
        "Investigação e Análise de Acidentes",
        "SGI – Sistema de Gestão Integrada: Qualidade, Meio Ambiente, Segurança e Saúde no trabalho",
        "Estágio Supervisionado"
      ]
    }
  }
];

export const cleanTextForSync = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

export function isMatchForSync(nameA: string, nameB: string): boolean {
  const normA = cleanTextForSync(nameA);
  const normB = cleanTextForSync(nameB);

  // 1. Exact match after cleaning
  if (normA === normB) return true;

  // 2. Expand abbreviations helper
  const expand = (str: string) => {
    return str
      .replace(/\bassist\b\.?/g, 'assistencia')
      .replace(/\benf\b\.?/g, 'enfermagem')
      .replace(/\bclin\b\.?/g, 'clinica')
      .replace(/\bcirurg\b\.?/g, 'cirurgica')
      .replace(/\bmed\b\.?/g, 'medica')
      .replace(/\burg\b\.?/g, 'urgencia')
      .replace(/\bemerg\b\.?/g, 'emergencia')
      .replace(/\bped\b\.?/g, 'pediatria')
      .replace(/\bobstet\b\.?/g, 'obstetricia')
      .replace(/\bpsi\b\.?/g, 'psicologia')
      .replace(/\bpsicol\b\.?/g, 'psicologia')
      .replace(/\btrab\b\.?/g, 'trabalho')
      .replace(/\banat\b\.?/g, 'anatomia')
      .replace(/\bfisiol\b\.?/g, 'fisiologia')
      .replace(/\bfarmac\b\.?/g, 'farmacologia')
      .replace(/\bi\b/g, '1')
      .replace(/\bii\b/g, '2')
      .replace(/\biii\b/g, '3')
      .replace(/\bsgi\b/g, 'sistema de gestao integrada')
      .replace(/[^a-z0-9\s]/g, '') // strip special characters
      .replace(/\s+/g, ' ')
      .trim();
  };

  const expA = expand(normA);
  const expB = expand(normB);

  if (expA === expB) return true;

  // 3. Check token intersection / similarity
  const tokensA = expA.split(' ').filter(t => t.length > 2);
  const tokensB = expB.split(' ').filter(t => t.length > 2);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Calculate intersection
  const intersect = tokensA.filter(t => tokensB.includes(t));
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersect.length / unionSize;

  if (jaccard >= 0.5) return true;

  // 4. Try Levenshtein Distance for close typos
  const distance = levenshteinDistanceFromSync(expA, expB);
  const maxLength = Math.max(expA.length, expB.length);
  const similarity = 1 - distance / maxLength;

  if (similarity > 0.75) return true;

  return false;
}

export function levenshteinDistanceFromSync(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

export function calculateSimilarityForSync(nameA: string, nameB: string): number {
  const normA = cleanTextForSync(nameA);
  const normB = cleanTextForSync(nameB);

  if (normA === normB) return 1.0;

  // Let's do token intersection
  const tokensA = normA.split(' ').filter(t => t.length > 2);
  const tokensB = normB.split(' ').filter(t => t.length > 2);

  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const intersect = tokensA.filter(t => tokensB.includes(t));
  const jaccard = intersect.length / new Set([...tokensA, ...tokensB]).size;

  const distance = levenshteinDistanceFromSync(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  const levSim = maxLength === 0 ? 1.0 : (1 - distance / maxLength);

  // Return weighted average
  return (jaccard * 0.4) + (levSim * 0.6);
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ensure we have the correct up-to-date localStorage schema. Wipes old versions once.
  if (typeof window !== 'undefined' && safeLocalStorage.getItem('oc_ls_version') !== 'v8') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < safeLocalStorage.length; i++) {
      const key = safeLocalStorage.key(i);
      if (key && key.startsWith('oc_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => safeLocalStorage.removeItem(k));
    safeLocalStorage.setItem('oc_ls_version', 'v8');
  }

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasReceivedInitialCloudSync, setHasReceivedInitialCloudSync] = useState<boolean>(false);

  // Storage Backups & Scheduling states
  const [backupSchedule, setBackupSchedule] = useState<BackupScheduleConfig>(() => {
    const saved = safeLocalStorage.getItem('oc_backup_schedule');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse backup schedule:', e);
      }
    }
    return {
      frequency: 'manual',
      enabled: false,
      lastBackupTime: null,
      nextBackupTime: null,
      hour: '02:00'
    };
  });

  const [storageBackups, setStorageBackups] = useState<StorageBackupFile[]>([]);
  const [isLoadingStorageBackups, setIsLoadingStorageBackups] = useState<boolean>(false);
  const [adminPasswordResetDone, setAdminPasswordResetDone] = useState<boolean>(() => {
    return safeLocalStorage.getItem('oc_admin_reset_done') === 'true';
  });

  // Load state from localStorage or use seeded data
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_current_user'), null);
  });

  const [users, setUsers] = useState<User[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_users'), initialUsers);
    const baseList = (val && Array.isArray(val) && val.length > 0) ? val : initialUsers;
    return baseList;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_courses'), initialCourses);
    return (val && Array.isArray(val)) ? val : initialCourses;
  });

  const [classes, setClasses] = useState<ClassSection[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_classes'), initialClasses);
    return (val && Array.isArray(val) && val.length > 0) ? val : initialClasses;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_subjects'), initialSubjects);
    return (val && Array.isArray(val)) ? val : initialSubjects;
  });

  const [grades, setGrades] = useState<GradeRecord[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_grades'), initialGrades);
    return (val && Array.isArray(val)) ? val : initialGrades;
  });

  const [attendance, setAttendance] = useState<AttendanceSession[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_attendance'), generateInitialAttendance());
  });

  const [directAbsences, setDirectAbsences] = useState<Record<string, number>>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_direct_absences'), {});
  });

  const [conceptRanges, setConceptRanges] = useState<ConceptRange[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_concept_ranges'), initialConceptRanges);
  });

  const [calendarEvents, setCalendarEvents] = useState<AcademicCalendarEvent[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_calendar_events'), initialCalendarEvents);
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_messages'), [
      {
        id: 'msg_1',
        senderName: 'Administração Pedagógica',
        senderRole: UserRole.ADMIN,
        recipientId: 'ALL_TEACHERS',
        content: 'Olá professores, lembrem-se que o fechamento das notas de S1 deve ocorrer até o dia 05/07. Atenciosamente, Coordenação.',
        date: '2026-06-28T09:00:00Z'
      }
    ]);
  });

  const [notifications, setNotifications] = useState<AcademicNotification[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_notifications'), [
      {
        id: 'not_1',
        userId: 'std_26101008',
        content: 'Bem-vindo ao novo Portal Acadêmico LYnx EDU!',
        date: '2026-06-30T08:00:00Z',
        read: false
      }
    ]);
  });

  // Security and backup states
  const [securityLogs, setSecurityLogs] = useState<any[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_security_logs'), [
      { id: 'sec_1', timestamp: new Date(Date.now() - 3600000).toISOString(), eventType: 'SISTEMA', ipAddress: '186.230.41.12', details: 'Firewall de Aplicação da Web (WAF) inicializado e ativo.', severity: 'low' },
      { id: 'sec_2', timestamp: new Date(Date.now() - 3000000).toISOString(), eventType: 'INTEGRIDADE', ipAddress: '186.230.41.12', details: 'Varredura automática: Todos os hashes de integridade batem com os dados originais.', severity: 'low' },
      { id: 'sec_3', timestamp: new Date(Date.now() - 1200000).toISOString(), eventType: 'BACKUP_AUTO', ipAddress: 'Servidor Nuvem (AWS us-east-1)', details: 'Sincronização em nuvem resiliente efetuada com sucesso.', severity: 'low' }
    ]);
  });

  const [cloudBackupStatus, setCloudBackupStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'quota_exceeded'>('idle');
  const [lastCloudBackupTime, setLastCloudBackupTime] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_last_cloud_backup_time') || new Date().toISOString();
  });
  const [lastLocalWriteTime, setLastLocalWriteTime] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_last_local_write_time');
  });

  const [failedAttemptsMap, setFailedAttemptsMap] = useState<Record<string, { count: number; lockoutUntil: number | null }>>({});

  const [currentPeriod, setCurrentPeriod] = useState<string>(() => {
    return safeLocalStorage.getItem('oc_current_period') || '2026/1';
  });

  const [periods, setPeriods] = useState<string[]>(() => {
    return safeJsonParse(safeLocalStorage.getItem('oc_periods'), ['2026/1', '2026/2', '2027/1', '2027/2', '2028/1', '2028/2']);
  });

  const [activeClassId, setActiveClassId] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_active_class_id') || 'class_enf_m1_matutino';
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(() => {
    return safeLocalStorage.getItem('oc_active_subject_id') || 'enf_m1_anatomia';
  });

  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('oc_auto_lock_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [simulatedDate, setSimulatedDate] = useState<string>(() => {
    return safeLocalStorage.getItem('oc_simulated_date') || '2026-07-01';
  });

  const [declarationConfigs, setDeclarationConfigs] = useState<DeclarationConfigs>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_declaration_configs'), {
      escolaridade: { startDate: '2026-02-04', endDate: '2026-06-26' },
      ctransp: { startDate: '2026-08-03', endDate: '2026-12-22' }
    });
    return val;
  });

  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_student_documents'), []);
    return val || [];
  });

  const [internships, setInternships] = useState<InternshipRecord[]>(() => {
    const val = safeJsonParse(safeLocalStorage.getItem('oc_internships'), []);
    return val || [];
  });

  useEffect(() => {
    safeLocalStorage.setItem('oc_auto_lock_enabled', autoLockEnabled ? 'true' : 'false');
  }, [autoLockEnabled]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_simulated_date', simulatedDate);
  }, [simulatedDate]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(declarationConfigs));
  }, [declarationConfigs]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_student_documents', JSON.stringify(studentDocuments));
  }, [studentDocuments]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_internships', JSON.stringify(internships));
  }, [internships]);

  const latestStateRef = React.useRef({
    users, courses, classes, subjects, grades, attendance, directAbsences,
    conceptRanges, calendarEvents, messages, notifications,
    currentPeriod, periods, simulatedDate, autoLockEnabled,
    declarationConfigs, studentDocuments, internships,
    adminPasswordResetDone, securityLogs
  });

  useEffect(() => {
    latestStateRef.current = {
      users, courses, classes, subjects, grades, attendance, directAbsences,
      conceptRanges, calendarEvents, messages, notifications,
      currentPeriod, periods, simulatedDate, autoLockEnabled,
      declarationConfigs, studentDocuments, internships,
      adminPasswordResetDone, securityLogs
    };
  }, [users, courses, classes, subjects, grades, attendance, directAbsences, conceptRanges, calendarEvents, messages, notifications, currentPeriod, periods, simulatedDate, autoLockEnabled, declarationConfigs, studentDocuments, internships, adminPasswordResetDone, securityLogs]);

  const lastReceivedPayloadRef = React.useRef<string>('');
  const lastLocalWriteTimeRef = React.useRef<string | null>(lastLocalWriteTime);
  const editStartTimeRef = React.useRef<number | null>(null);

  useEffect(() => {
    lastLocalWriteTimeRef.current = lastLocalWriteTime;
  }, [lastLocalWriteTime]);

  // Initial synchronization & real-time updates with Cloud Firestore
  useEffect(() => {
    if (!db) {
      // Offline fallback
      setUsers(prev => (prev && prev.length > 0) ? prev : initialUsers);
      setClasses(prev => (prev && prev.length > 0) ? prev : initialClasses);
      setGrades(prev => (prev && prev.length > 0) ? prev : initialGrades);
      setIsLoading(false);
      setCloudBackupStatus('offline');
      return;
    }

    let unsubscribeSnapshot: (() => void) | undefined;

    const attachSnapshotListener = () => {
      if (unsubscribeSnapshot) {
        try { unsubscribeSnapshot(); } catch (e) {}
        unsubscribeSnapshot = undefined;
      }

      setCloudBackupStatus('syncing');
      const stateDocRef = doc(db, 'academic_portal', 'state_node');

      unsubscribeSnapshot = onSnapshot(stateDocRef, async (docSnap) => {
        try {
          if (docSnap.exists()) {
            // Bypassing local write echoes to avoid recursive overwrites and infinite render cycles
            if (docSnap.metadata.hasPendingWrites) {
              return;
            }

            const state = docSnap.data() as SystemStatePayload;

            // Conflict Resolution: If we have a more recent local modification, do not let older cloud data overwrite it.
            if (lastLocalWriteTimeRef.current) {
              const localTime = new Date(lastLocalWriteTimeRef.current).getTime();
              const cloudTime = state.lastBackupTime ? new Date(state.lastBackupTime).getTime() : 0;
              if (cloudTime < localTime) {
                console.log('[onSnapshot] Conflito detectado: O estado local é mais recente do que o recebido da nuvem. Mantendo dados locais.');
                return;
              }
            }

            // Integrity validation: protect diários against corrupted or completely empty cloud states
            const isStateValid = state && 
                                Array.isArray(state.users) && state.users.length > 0 &&
                                Array.isArray(state.classes) && state.classes.length > 0;

            if (!isStateValid) {
              console.warn('[onSnapshot] Sincronização em nuvem abortada: Nó de dados recebido é inválido ou está vazio.');
              setCloudBackupStatus('error');
              addSecurityLog('SINC_NUVEM_ABORTADA', 'Importação em nuvem abortada por integridade de dados comprometida.', 'medium');
              return;
            }

            const currentState = latestStateRef.current;

            const usersFromCloud = state.users !== undefined ? state.users : currentState.users;

            // Build comparison payload (exclude transient states/security logs from matching block)
            const receivedPayload = {
              users: usersFromCloud,
              courses: state.courses !== undefined ? state.courses : currentState.courses,
              classes: state.classes !== undefined ? state.classes : currentState.classes,
              subjects: state.subjects !== undefined ? state.subjects : currentState.subjects,
              grades: state.grades !== undefined ? state.grades : currentState.grades,
              attendance: state.attendance !== undefined ? state.attendance : currentState.attendance,
              directAbsences: state.directAbsences !== undefined ? state.directAbsences : currentState.directAbsences,
              conceptRanges: state.conceptRanges !== undefined ? state.conceptRanges : currentState.conceptRanges,
              calendarEvents: state.calendarEvents !== undefined ? state.calendarEvents : currentState.calendarEvents,
              messages: state.messages !== undefined ? state.messages : currentState.messages,
              notifications: state.notifications !== undefined ? state.notifications : currentState.notifications,
              currentPeriod: state.currentPeriod !== undefined ? state.currentPeriod : currentState.currentPeriod,
              periods: state.periods !== undefined ? state.periods : currentState.periods,
              simulatedDate: state.simulatedDate !== undefined ? state.simulatedDate : currentState.simulatedDate,
              autoLockEnabled: state.autoLockEnabled !== undefined ? state.autoLockEnabled : currentState.autoLockEnabled,
              declarationConfigs: state.declarationConfigs !== undefined ? state.declarationConfigs : currentState.declarationConfigs,
              studentDocuments: state.studentDocuments !== undefined ? state.studentDocuments : currentState.studentDocuments,
              internships: state.internships !== undefined ? state.internships : currentState.internships,
              adminPasswordResetDone: state.adminPasswordResetDone !== undefined ? state.adminPasswordResetDone : currentState.adminPasswordResetDone
            };
            const receivedPayloadStr = JSON.stringify(receivedPayload);
            lastReceivedPayloadRef.current = receivedPayloadStr;

            // Apply state changes to React and safeLocalStorage
            if (state.users) {
              setUsers(state.users);
              safeLocalStorage.setItem('oc_users', JSON.stringify(state.users));
            }
            if (state.courses) { setCourses(state.courses); safeLocalStorage.setItem('oc_courses', JSON.stringify(state.courses)); }
            if (state.classes) { setClasses(state.classes); safeLocalStorage.setItem('oc_classes', JSON.stringify(state.classes)); }
            if (state.subjects) { setSubjects(state.subjects); safeLocalStorage.setItem('oc_subjects', JSON.stringify(state.subjects)); }
            if (state.grades) { setGrades(state.grades); safeLocalStorage.setItem('oc_grades', JSON.stringify(state.grades)); }
            if (state.attendance) { setAttendance(state.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(state.attendance)); }
            if (state.directAbsences) { setDirectAbsences(state.directAbsences); safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(state.directAbsences)); }
            if (state.conceptRanges) { setConceptRanges(state.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(state.conceptRanges)); }
            if (state.calendarEvents) { setCalendarEvents(state.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(state.calendarEvents)); }
            if (state.messages) { setMessages(state.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(state.messages)); }
            if (state.notifications) { setNotifications(state.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(state.notifications)); }
            if (state.currentPeriod) { setCurrentPeriod(state.currentPeriod); safeLocalStorage.setItem('oc_current_period', state.currentPeriod); }
            if (state.periods) { setPeriods(state.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(state.periods)); }
            if (state.simulatedDate) { setSimulatedDate(state.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', state.simulatedDate); }
            if (state.autoLockEnabled !== undefined) { setAutoLockEnabled(state.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', state.autoLockEnabled ? 'true' : 'false'); }
            if (state.securityLogs) { setSecurityLogs(state.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(state.securityLogs)); }
            if (state.declarationConfigs) { setDeclarationConfigs(state.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(state.declarationConfigs)); }
            if (state.studentDocuments) { setStudentDocuments(state.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(state.studentDocuments)); }
            if (state.internships) { setInternships(state.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(state.internships)); }
            if (state.adminPasswordResetDone !== undefined) {
              setAdminPasswordResetDone(state.adminPasswordResetDone);
              safeLocalStorage.setItem('oc_admin_reset_done', state.adminPasswordResetDone ? 'true' : 'false');
            }

            if (state.lastBackupTime) {
              setLastCloudBackupTime(state.lastBackupTime);
              safeLocalStorage.setItem('oc_last_cloud_backup_time', state.lastBackupTime);
            }

            setCloudBackupStatus('success');
            setHasReceivedInitialCloudSync(true);
          } else {
            setCloudBackupStatus('idle');
            // If Firestore database is empty, seed it with initial setup data
            const payload: SystemStatePayload = {
              users, courses, classes, subjects, grades, attendance, directAbsences,
              conceptRanges, calendarEvents, messages, notifications,
              currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
              declarationConfigs, studentDocuments, internships,
              adminPasswordResetDone
            };
            await saveStateToCloud(payload);
            addSecurityLog('SINC_NUVEM_CRIACAO', 'Primeiro nó de dados criado e persistido com sucesso na nuvem Firestore.', 'low');
            setHasReceivedInitialCloudSync(true);
          }
        } catch (err: any) {
          console.error('Erro ao processar dados recebidos do Firestore:', err);
          setCloudBackupStatus('error');
        } finally {
          // Enforce post-load validation on the final states to protect against empty/null databases
          setUsers(prev => {
            if (!prev || !Array.isArray(prev) || prev.length === 0) {
              console.warn('[postLoadDefense] Coleção de usuários inválida ou nula, restaurando padrão.');
              return initialUsers;
            }
            return prev;
          });
          setClasses(prev => {
            if (!prev || !Array.isArray(prev) || prev.length === 0) {
              console.warn('[postLoadDefense] Coleção de turmas inválida ou nula, restaurando padrão.');
              return initialClasses;
            }
            return prev;
          });
          setGrades(prev => {
            if (!prev || !Array.isArray(prev)) {
              console.warn('[postLoadDefense] Coleção de notas inválida ou nula, restaurando padrão.');
              return initialGrades;
            }
            return prev;
          });
          // Graceful delay to prevent flickering on ultra-fast loads
          setTimeout(() => {
            setIsLoading(false);
          }, 400);
        }
      }, (err) => {
        if (unsubscribeSnapshot) {
          try {
            unsubscribeSnapshot();
          } catch (e) {
            console.error('Erro ao cancelar inscrição do Firestore:', e);
          }
        }
        const isQuota = err?.code === 'resource-exhausted' || 
                        err?.message?.toLowerCase().includes('quota') || 
                        err?.message?.toLowerCase().includes('exhausted') ||
                        err?.message?.toLowerCase().includes('limit exceeded');
        const isOffline = err?.message?.toLowerCase().includes('offline') || 
                          err?.code === 'unavailable' || 
                          err?.message?.toLowerCase().includes('network') || 
                          err?.message?.toLowerCase().includes('unreachable');
        const isPermission = isPermissionError(err);

        if (isQuota) {
          console.error('Cota do Firestore esgotada:', err);
          setCloudBackupStatus('quota_exceeded');
          addSecurityLog('SINC_NUVEM_COTA', 'Limite de cota de leitura/escrita diária do Firestore atingido.', 'medium');
        } else if (isPermission) {
          console.warn('Sincronização em nuvem aguardando autenticação (ou provedor "Anônimo" pendente de habilitação no Console do Firebase).');
          setCloudBackupStatus('offline');
        } else if (isOffline) {
          console.warn('Portal acadêmico operando em modo offline-first (Firestore indisponível).');
          setCloudBackupStatus('offline');
          addSecurityLog('SINC_NUVEM_OFFLINE', 'Portal operando em modo local/offline (Firestore temporariamente indisponível).', 'low');
        } else {
          console.error('Erro na escuta de atualizações em nuvem:', err);
          setCloudBackupStatus('error');
          addSecurityLog('SINC_NUVEM_FALHA', 'Falha na conexão de escuta do banco em nuvem.', 'medium');
        }
        setIsLoading(false);
      });
    };

    let unsubscribeAuth: (() => void) | undefined;
    if (auth) {
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          attachSnapshotListener();
        } else {
          attachSnapshotListener();
        }
      });
    } else {
      attachSnapshotListener();
    }

    return () => {
      if (unsubscribeSnapshot) {
        try {
          unsubscribeSnapshot();
        } catch (e) {
          console.error('Erro ao limpar inscrição do Firestore no unmount:', e);
        }
      }
      if (unsubscribeAuth) {
        try {
          unsubscribeAuth();
        } catch (e) {
          console.error('Erro ao limpar inscrição de auth no unmount:', e);
        }
      }
    };
  }, []);

  const updateCalendarEventDate = (id: string, date: string) => {
    setCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, date } : e));
    addSecurityLog('SISTEMA_PRAZO', `Data limite de fechamento (${id}) alterada para ${date}.`, 'low');
  };

  const getS1ClosingDate = () => calendarEvents.find(e => e.type === 'CLOSING_S1')?.date || '';
  const getS2ClosingDate = () => calendarEvents.find(e => e.type === 'CLOSING_S2')?.date || '';
  const getDefinitiveClosingDate = () => calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date || '';

  const isClassS1Locked = (cl: ClassSection) => {
    if (cl.closedDefinitive || cl.closedS1) return true;
    if (autoLockEnabled) {
      const s1Date = getS1ClosingDate();
      if (s1Date && simulatedDate >= s1Date) return true;
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  const isClassS2Locked = (cl: ClassSection) => {
    if (cl.closedDefinitive || cl.closedS2) return true;
    if (autoLockEnabled) {
      const s2Date = getS2ClosingDate();
      if (s2Date && simulatedDate >= s2Date) return true;
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  const isClassDefinitiveLocked = (cl: ClassSection) => {
    if (cl.closedDefinitive) return true;
    if (autoLockEnabled) {
      const defDate = getDefinitiveClosingDate();
      if (defDate && simulatedDate >= defDate) return true;
    }
    return false;
  };

  // Sync to localStorage
  useEffect(() => {
    safeLocalStorage.setItem('oc_current_period', currentPeriod);
  }, [currentPeriod]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_periods', JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_current_user', currentUser ? JSON.stringify(currentUser) : '');
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_grades', JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(directAbsences));
  }, [directAbsences]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(conceptRanges));
  }, [conceptRanges]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    safeLocalStorage.setItem('oc_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Unify duplicate subjects: "INTRODUÇÃO Á ENFERMAGEM" and "Introdução à Enfermagem"
  const unifiedRef = React.useRef(false);
  useEffect(() => {
    if (isLoading || unifiedRef.current) return;

    const wrongSubj = subjects.find(s => s.name === 'INTRODUÇÃO Á ENFERMAGEM');
    const correctSubj = subjects.find(s => s.name === 'Introdução à Enfermagem');

    if (wrongSubj && correctSubj) {
      // 1. Change the subjectId of all grade records that are linked to the wrong subject to the correct one
      const updatedGrades = grades.map(g => {
        if (g.subjectId === wrongSubj.id) {
          return { ...g, subjectId: correctSubj.id };
        }
        return g;
      });

      // 2. Unify directAbsences
      const updatedDirectAbsences = { ...directAbsences };
      let absencesChanged = false;
      Object.keys(directAbsences).forEach(key => {
        const parts = key.split('_');
        if (parts.length === 3 && parts[1] === wrongSubj.id) {
          const newKey = `${parts[0]}_${correctSubj.id}_${parts[2]}`;
          updatedDirectAbsences[newKey] = directAbsences[key];
          delete updatedDirectAbsences[key];
          absencesChanged = true;
        }
      });

      // 3. Delete the duplicate subject "INTRODUÇÃO Á ENFERMAGEM" from the list of subjects
      const updatedSubjects = subjects.filter(s => s.id !== wrongSubj.id);

      setGrades(updatedGrades);
      setSubjects(updatedSubjects);
      if (absencesChanged) {
        setDirectAbsences(updatedDirectAbsences);
      }

      addSecurityLog(
        'UNIFICACAO_DISCIPLINAS',
        `Unificação concluída: Notas e faltas directAbsences da disciplina "${wrongSubj.name}" migradas para "${correctSubj.name}", e a disciplina duplicada foi removida.`,
        'medium'
      );
      unifiedRef.current = true;
    } else if (correctSubj) {
      // Fallback: wrongSubj is already deleted from subjects, but directAbsences might still contain its keys
      const updatedDirectAbsences = { ...directAbsences };
      let absencesChanged = false;
      const allSubjectIds = new Set(subjects.map(s => s.id));

      Object.keys(directAbsences).forEach(key => {
        const parts = key.split('_');
        if (parts.length === 3) {
          const [classId, subjId, studentId] = parts;
          if (!allSubjectIds.has(subjId)) {
            // Find if this class belongs to 'ENF' or 'ENF_EAD' or similar
            const targetClass = classes.find(c => c.id === classId);
            const isEnfermagem = targetClass && (
              targetClass.courseId === 'ENF' || 
              targetClass.courseId === 'ENF_EAD' || 
              targetClass.name.toUpperCase().includes('ENFERMAGEM')
            );
            if (isEnfermagem || subjId.startsWith('sub_imp_')) {
              const newKey = `${classId}_${correctSubj.id}_${studentId}`;
              updatedDirectAbsences[newKey] = directAbsences[key];
              delete updatedDirectAbsences[key];
              absencesChanged = true;
            }
          }
        }
      });

      if (absencesChanged) {
        setDirectAbsences(updatedDirectAbsences);
        addSecurityLog(
          'UNIFICACAO_DISCIPLINAS_FALTAS_CORRECAO',
          `Migração tardia de faltas: Chaves directAbsences órfãs de Enfermagem migradas com sucesso para a disciplina "${correctSubj.name}".`,
          'medium'
        );
      }
      unifiedRef.current = true;
    }
  }, [isLoading, subjects, grades, directAbsences, classes]);

  useEffect(() => {
    if (activeClassId) safeLocalStorage.setItem('oc_active_class_id', activeClassId);
    else safeLocalStorage.removeItem('oc_active_class_id');
  }, [activeClassId]);

  useEffect(() => {
    if (activeSubjectId) safeLocalStorage.setItem('oc_active_subject_id', activeSubjectId);
    else safeLocalStorage.removeItem('oc_active_subject_id');
  }, [activeSubjectId]);



  // Recalculate grades whenever attendance or concept ranges change
  useEffect(() => {
    // We update grades to match the attendance frequency automatically
    setGrades(prevGrades => {
      let changed = false;
      const updated = prevGrades.map(g => {
        const { frequency } = getStudentAbsencesInternal(g.studentId, g.subjectId, g.classId, attendance, subjects);
        const newResult = getStudentResult(g, frequency);
        const newConcept = getStudentConcept(g.pf, conceptRanges);
        
        if (g.result !== newResult || g.concept !== newConcept) {
          changed = true;
          return { ...g, result: newResult, concept: newConcept };
        }
        return g;
      });
      return changed ? updated : prevGrades;
    });
  }, [attendance, conceptRanges, subjects]);

  // Absences Internal Helper
  const getStudentAbsencesInternal = (
    studentId: string, 
    subjectId: string, 
    classId: string | undefined,
    sessionsList: AttendanceSession[],
    subjectsList: Subject[]
  ) => {
    let totalAbsences = 0;
    let hasDirect = false;

    const resolvedClassId = classId || users.find(u => u.id === studentId)?.classId;

    if (resolvedClassId) {
      const key = `${resolvedClassId}_${subjectId}_${studentId}`;
      if (directAbsences && directAbsences[key] !== undefined) {
        totalAbsences = directAbsences[key];
        hasDirect = true;
      }
    }

    if (!hasDirect) {
      const subjectSessions = sessionsList.filter(s => s.subjectId === subjectId);
      subjectSessions.forEach(sess => {
        if (sess.date.includes('-00') || sess.date.startsWith('2026-00')) return;
        if (sess.records[studentId] === 'F') {
          totalAbsences += 1;
        }
      });
    }

    const subject = subjectsList.find(s => s.id === subjectId);
    const workload = subject ? subject.workload : 80;

    // Calculate frequency relative to the total subject workload to prevent premature failures
    const frequency = workload === 0 ? 100 : Math.max(0, ((workload - totalAbsences) / workload) * 100);
    return { total: totalAbsences, frequency };
  };

  const updateStudentAbsences = (studentId: string, subjectId: string, classId: string, total: number) => {
    const key = `${classId}_${subjectId}_${studentId}`;
    setDirectAbsences(prev => ({
      ...prev,
      [key]: total
    }));
  };

  // Absences Helper for components
  const getStudentAbsences = (studentId: string, subjectId: string, classId?: string) => {
    return getStudentAbsencesInternal(studentId, subjectId, classId, attendance, subjects);
  };

  const getStudentAttendanceGrid = (studentId: string) => {
    const grid: { [subjectId: string]: { total: number, frequency: number } } = {};
    const studentClassId = users.find(u => u.id === studentId)?.classId;
    subjects.forEach(sub => {
      grid[sub.id] = getStudentAbsences(studentId, sub.id, studentClassId);
    });
    return grid;
  };

  // Auth Functions
  const login = async (username: string, cpfOrEnrollment: string, role: UserRole): Promise<boolean> => {
    const cleanedUsername = username.trim().toLowerCase();
    const cleanedCpfOrEnrollment = cpfOrEnrollment.trim();

    // 1. Sanitize Inputs (XSS prevention)
    const sanitizedUsername = cleanedUsername.replace(/<[^>]*>/g, '');
    const sanitizedCpfOrEnrollment = cleanedCpfOrEnrollment.replace(/<[^>]*>/g, '');

    // 2. Check lockout limits
    const lockout = failedAttemptsMap[sanitizedUsername];
    if (lockout && lockout.lockoutUntil && lockout.lockoutUntil > Date.now()) {
      const remainingSecs = Math.ceil((lockout.lockoutUntil - Date.now()) / 1000);
      addSecurityLog('SISTEMA_BLOQUEIO', `Tentativa de login rejeitada para [${sanitizedUsername}] (Bloqueio Anti-Brute-Force ativo por mais ${remainingSecs}s).`, 'medium');
      throw new Error(`Acesso bloqueado por excesso de tentativas. Aguarde ${remainingSecs}s.`);
    }

    // Find user in our local database first
    const found = users.find(u => {
      if (u.role !== role) return false;
      if (role === UserRole.ADMIN) {
        const matchesAdminUsername = u.id === 'admin' || u.username.toLowerCase() === sanitizedUsername || sanitizedUsername === 'lindemberg' || sanitizedUsername === 'admin';
        const matchesPassword = u.password ? (u.password === sanitizedCpfOrEnrollment) : false;
        const matchesCpf = u.cpf && u.cpf === sanitizedCpfOrEnrollment;
        return matchesAdminUsername && (matchesPassword || matchesCpf);
      } else if (role === UserRole.TEACHER) {
        // Log in with either username, enrollment, or CPF as identity, and password, CPF, or enrollment as credential
        // Normalize "professor_marcelo" -> "prof_marcelo" and vice-versa for absolute user friendliness
        const normalizedInput = sanitizedUsername.startsWith('professor_')
          ? sanitizedUsername.replace('professor_', 'prof_')
          : sanitizedUsername.startsWith('prof_')
            ? sanitizedUsername.replace('prof_', 'professor_')
            : sanitizedUsername;

        const matchesIdentity = 
          u.username.toLowerCase() === sanitizedUsername || 
          u.username.toLowerCase() === normalizedInput ||
          u.enrollment === sanitizedUsername || 
          (u.cpf && u.cpf.replace(/\D/g, '') === sanitizedUsername.replace(/\D/g, ''));
        const matchesPassword = 
          u.password === sanitizedCpfOrEnrollment || 
          u.enrollment === sanitizedCpfOrEnrollment || 
          u.cpf === sanitizedCpfOrEnrollment;
        return matchesIdentity && matchesPassword;
      } else if (role === UserRole.STUDENT) {
        // Log in with Enrollment (Matrícula) and password (default password is the enrollment itself)
        const matchesUsername = u.enrollment === sanitizedUsername || u.username.toLowerCase() === sanitizedUsername;
        const studentPassword = u.password || u.enrollment;
        const matchesPassword = studentPassword === sanitizedCpfOrEnrollment;
        return matchesUsername && matchesPassword;
      }
      return false;
    });

    if (found && found.active) {
      let isPasswordCorrect = false;

      if (auth && found.email) {
        try {
          // Attempt to authenticate against Firebase Auth
          await signInWithEmailAndPassword(auth, found.email.toLowerCase(), sanitizedCpfOrEnrollment);
          isPasswordCorrect = true;
          
          // Sync password if changed in Firebase Auth (e.g. via reset email)
          if (found.password !== sanitizedCpfOrEnrollment) {
            found.password = sanitizedCpfOrEnrollment;
            setUsers(prev => prev.map(u => u.id === found.id ? { ...u, password: sanitizedCpfOrEnrollment } : u));
            addSecurityLog('LOGIN_SYNC', `Senha sincronizada no portal para o usuário [${sanitizedUsername}] após login com sucesso via Firebase Auth.`, 'low');
          }
        } catch (authErr: any) {
          console.log('Firebase Auth login attempt result:', authErr.code || authErr.message);
          
          if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            // Fallback to local password (e.g. if the administrator changed the password in the portal)
            const localPassword = found.password || (role === UserRole.STUDENT ? found.enrollment : '');
            if (localPassword !== '' && sanitizedCpfOrEnrollment === localPassword) {
              isPasswordCorrect = true;
              addSecurityLog('LOGIN_LOCAL_FALLBACK', `Login aceito usando a nova senha local atualizada pelo Administrador para [${sanitizedUsername}].`, 'low');
            } else {
              isPasswordCorrect = false;
              addSecurityLog('LOGIN_FALHA_CRED', `Tentativa de login rejeitada por senha incorreta para [${sanitizedUsername}].`, 'medium');
            }
          } else {
            // User does not exist in Firebase Auth or network issue. Fallback to local db check!
            const localPassword = found.password || (role === UserRole.STUDENT ? found.enrollment : '');
            if (localPassword !== '' && sanitizedCpfOrEnrollment === localPassword) {
              isPasswordCorrect = true;
              
              // Dynamically self-heal / provision the Firebase Auth account in the background
              try {
                await createUserWithEmailAndPassword(auth, found.email.toLowerCase(), sanitizedCpfOrEnrollment);
                addSecurityLog('AUTH_AUTO_CRIACAO', `Conta Firebase Auth provisionada automaticamente para o usuário [${sanitizedUsername}] no primeiro login.`, 'low');
              } catch (createErr: any) {
                if (createErr.code !== 'auth/email-already-in-use') {
                  console.warn('Silent auto-registration on login failed:', createErr.message);
                }
              }
            }
          }
        }
      } else {
        // Fallback for offline mode or empty email
        const localPassword = found.password || (role === UserRole.STUDENT ? found.enrollment : '');
        if (localPassword !== '' && sanitizedCpfOrEnrollment === localPassword) {
          isPasswordCorrect = true;
        }
      }

      if (isPasswordCorrect) {
        // Reset count
        setFailedAttemptsMap(prev => ({
          ...prev,
          [sanitizedUsername]: { count: 0, lockoutUntil: null }
        }));
        setCurrentUser(found);
        addSecurityLog('LOGIN_SUCESSO', `Usuário [${sanitizedUsername}] autenticado com sucesso no portal acadêmico.`, 'low');
        return true;
      }
    }

    // Increment failed count
    setFailedAttemptsMap(prev => {
      const current = (prev[sanitizedUsername]?.count || 0) + 1;
      let lockoutUntil: number | null = null;
      if (current >= 3) {
        lockoutUntil = Date.now() + 30000; // 30s lockout
        addSecurityLog('SISTEMA_LOCKOUT', `Múltiplas tentativas falhas para [${sanitizedUsername}]. Bloqueio preventivo ativado por 30 segundos.`, 'high');
      } else {
        addSecurityLog('LOGIN_FALHA', `Credenciais inválidas informadas para [${sanitizedUsername}]. Tentativa ${current}/3.`, 'medium');
      }
      return {
        ...prev,
        [sanitizedUsername]: { count: current, lockoutUntil }
      };
    });

    return false;
  };

  const logout = () => {
    // Before we clear the user session, we trigger an immediate cloud synchronization
    // to ensure any pending admin/teacher local edits are fully flushed to Firestore.
    if (cloudBackupStatus !== 'quota_exceeded') {
      const payload: SystemStatePayload = {
        users, courses, classes, subjects, grades, attendance, directAbsences,
        conceptRanges, calendarEvents, messages, notifications,
        currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
        declarationConfigs, studentDocuments, internships, adminPasswordResetDone
      };
      saveStateToCloud(payload).catch(err => {
        console.warn('Silent cloud save failure on logout (likely quota/network limits):', err?.message || err);
      });
    }
    setCurrentUser(null);
  };

  const updatePassword = async (userId: string, newPass: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
    addNotification(userId, 'Sua senha foi alterada com sucesso.');
    addSecurityLog('SENHA_ALTERADA', `Senha do usuário ID ${userId} alterada com sucesso.`, 'low');

    if (auth && auth.currentUser) {
      try {
        const { updatePassword: authUpdatePassword } = await import('firebase/auth');
        await authUpdatePassword(auth.currentUser, newPass);
        addSecurityLog('SENHA_ALTERADA_AUTH', `Senha sincronizada no Firebase Auth para o usuário logado.`, 'low');
      } catch (err: any) {
        console.warn('Firebase Auth password update skipped or failed:', err.message);
      }
    }
  };

  const recoverPassword = async (email: string): Promise<string | null> => {
    const trimmedEmail = email.trim().toLowerCase();
    const found = users.find(u => u.email && u.email.toLowerCase() === trimmedEmail);
    if (!found) {
      return null;
    }

    if (auth) {
      try {
        await sendPasswordResetEmail(auth, found.email);
        addSecurityLog('RECUPERACAO_SENHA', `Link de recuperação enviado com sucesso via Firebase Auth para ${found.email}.`, 'low');
        return `Um e-mail de recuperação foi enviado para ${found.email}. Verifique sua caixa de entrada e spam.`;
      } catch (err: any) {
        console.error('Firebase Auth sendPasswordResetEmail error:', err);
        if (err.code === 'auth/user-not-found') {
          try {
            const tempPassword = found.password || found.enrollment || 'Portal@123';
            await createUserWithEmailAndPassword(auth, found.email, tempPassword);
            await sendPasswordResetEmail(auth, found.email);
            addSecurityLog('RECUPERACAO_SENHA_AUTO_REG', `Usuário auto-registrado e link enviado para ${found.email}.`, 'medium');
            return `Um e-mail de recuperação foi enviado para ${found.email}. Verifique sua caixa de entrada e spam.`;
          } catch (createErr: any) {
            console.error('Auto registration failed during password recovery:', createErr);
            throw new Error(`Falha no serviço de e-mail do Firebase: ${createErr.message || createErr}`);
          }
        }
        throw new Error(`Erro do Firebase Auth: ${err.message || err}`);
      }
    } else {
      addSecurityLog('RECUPERACAO_SENHA_MOCK', `Recuperação de senha simulada para ${found.email} (modo offline).`, 'low');
      return `[Modo Offline/Simulado] Um e-mail de recuperação foi enviado para ${found.email}.`;
    }
  };

  const resetAdminPassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (adminPasswordResetDone) {
      return { success: false, message: 'A redefinição única de senha do administrador já foi utilizada.' };
    }
    
    setUsers(prev => {
      const updated = prev.map(u => u.id === 'admin' ? { ...u, password: newPassword } : u);
      safeLocalStorage.setItem('oc_users', JSON.stringify(updated));
      return updated;
    });
    
    setAdminPasswordResetDone(true);
    safeLocalStorage.setItem('oc_admin_reset_done', 'true');
    
    addSecurityLog('REDEFINICAO_ADMIN_UNICA', 'A redefinição única e manual da senha do administrador foi executada com sucesso.', 'high');
    
    return { success: true, message: 'Senha do administrador redefinida com sucesso!' };
  };

  const unlockAdminReset = () => {
    setAdminPasswordResetDone(false);
    safeLocalStorage.setItem('oc_admin_reset_done', 'false');
    addSecurityLog('DESBLOQUEIO_REDEFINICAO', 'A redefinição de senha do administrador foi desbloqueada para novas tentativas.', 'medium');
  };

  // Grade Calculations
  const calculateS1 = (g: Partial<GradeRecord>) => {
    const av1 = g.av1 ?? 0;
    const av2 = g.av2 ?? 0;
    const av3 = g.av3 ?? 0;
    const recS1 = g.recS1;

    let avs = [av1, av2, av3];
    if (recS1 !== null && recS1 !== undefined) {
      const minIndex = avs.indexOf(Math.min(...avs));
      if (recS1 > avs[minIndex]) {
        avs[minIndex] = recS1;
      }
    }
    return Math.min(30, avs[0] + avs[1] + avs[2]);
  };

  const calculateS2 = (g: Partial<GradeRecord>) => {
    const av4 = g.av4 ?? 0;
    const av5 = g.av5 ?? 0;
    const av6 = g.av6 ?? 0;
    const recS2 = g.recS2;

    let avs = [av4, av5, av6];
    if (recS2 !== null && recS2 !== undefined) {
      const minIndex = avs.indexOf(Math.min(...avs));
      if (recS2 > avs[minIndex]) {
        avs[minIndex] = recS2;
      }
    }
    return Math.min(30, avs[0] + avs[1] + avs[2]);
  };

  const getStudentConcept = (finalGrade: number, ranges: ConceptRange[]) => {
    const matched = ranges.find(r => finalGrade >= r.minGrade && finalGrade <= r.maxGrade);
    return matched ? matched.letter : 'D';
  };

  const getStudentResult = (g: Partial<GradeRecord> & { pf: number }, frequency: number): 'APTO' | 'NÃO APTO' | 'REP. FALTAS' | 'Pendente' => {
    // If student was failed by attendance
    if (frequency < 75) {
      return 'REP. FALTAS';
    }
    const totalScore = g.pf;
    const isApproved = totalScore >= 60;
    
    if (isApproved) {
      return 'APTO';
    }
    return 'NÃO APTO';
  };

  // Mutators
  const addCourse = (course: Course) => {
    const uppercaseCourse = {
      ...course,
      name: course.name.toUpperCase(),
      description: course.description.toUpperCase()
    };
    setCourses(prev => [...prev, uppercaseCourse]);
  };

  const addClass = (cls: ClassSection) => {
    const uppercaseCls = {
      ...cls,
      name: cls.name.toUpperCase(),
      code: cls.code ? cls.code.toUpperCase() : cls.code
    };
    setClasses(prev => [...prev, uppercaseCls]);
    // Create automatic diaries/records for all existing subjects under this class's course
    const classSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);
    const classStudents = users.filter(u => u.role === UserRole.STUDENT && u.classId === cls.id);

    const newGrades: GradeRecord[] = [];
    classSubjects.forEach(sub => {
      classStudents.forEach(std => {
        newGrades.push({
          id: `g_new_${Date.now()}_${sub.id}_${std.id}`,
          classId: cls.id,
          subjectId: sub.id,
          studentId: std.id,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, afc: null, recS2: null, s2: 0,
          extra: null, conselho: null, pf: 0,
          concept: 'D',
          result: 'Pendente'
        });
      });
    });

    if (newGrades.length > 0) {
      setGrades(prev => [...prev, ...newGrades]);
    }
  };

  const deleteClass = (id: string) => {
    const classToDelete = classes.find(c => c.id === id);
    setClasses(prev => prev.filter(c => c.id !== id));
    setGrades(prev => prev.filter(g => g.classId !== id));
    setAttendance(prev => prev.filter(a => a.classId !== id));
    if (activeClassId === id) {
      setActiveClassId(null);
    }
    addSecurityLog('TURMA_REMOVIDA', `Turma ${classToDelete?.name || ''} (ID: ${id}) foi excluída do sistema.`, 'medium');
  };

  const updateClass = (id: string, updates: Partial<ClassSection>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    if (uppercaseUpdates.code) uppercaseUpdates.code = uppercaseUpdates.code.toUpperCase();
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...uppercaseUpdates } : c));
    addSecurityLog('TURMA_ATUALIZADA', `Turma ID ${id} atualizada com novas informações.`, 'low');
  };

  const addSubject = (sub: Subject) => {
    const uppercaseSub = {
      ...sub,
      name: sub.name.toUpperCase()
    };
    setSubjects(prev => [...prev, uppercaseSub]);
    
    // Auto generate grades for all classes matching course & module
    const matchingClasses = classes.filter(c => c.courseId === sub.courseId && c.module === sub.module);

    const newGrades: GradeRecord[] = [];
    matchingClasses.forEach(cls => {
      const classStudents = users.filter(u => u.role === UserRole.STUDENT && u.classId === cls.id);
      classStudents.forEach(std => {
        newGrades.push({
          id: `g_new_${Date.now()}_${sub.id}_${std.id}`,
          classId: cls.id,
          subjectId: sub.id,
          studentId: std.id,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, av6: null, recS2: null, s2: 0,
          extra: null, conselho: null, afc: null, pf: 0,
          concept: 'D',
          result: 'Pendente'
        });
      });
    });

    if (newGrades.length > 0) {
      setGrades(prev => [...prev, ...newGrades]);
    }
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...uppercaseUpdates } : s));
    addSecurityLog('DISCIPLINA_ATUALIZADA', `Disciplina ID ${id} atualizada com novas informações.`, 'low');
  };

  const deleteSubject = (id: string) => {
    const subToDelete = subjects.find(s => s.id === id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setGrades(prev => prev.filter(g => g.subjectId !== id));
    setAttendance(prev => prev.filter(a => a.subjectId !== id));
    if (activeSubjectId === id) {
      setActiveSubjectId(null);
    }
    addSecurityLog('DISCIPLINA_REMOVIDA', `Disciplina ${subToDelete?.name || ''} (ID: ${id}) foi excluída do sistema.`, 'medium');
  };

  const addUser = (user: User) => {
    const uppercaseUser = {
      ...user,
      name: user.name.toUpperCase(),
      email: user.email ? user.email.toUpperCase() : user.email,
      cpf: user.cpf ? user.cpf.toUpperCase() : user.cpf,
      enrollment: user.enrollment ? user.enrollment.toUpperCase() : user.enrollment,
    };
    setUsers(prev => [...prev, uppercaseUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const uppercaseUpdates = { ...updates };
    if (uppercaseUpdates.name) uppercaseUpdates.name = uppercaseUpdates.name.toUpperCase();
    if (uppercaseUpdates.email) uppercaseUpdates.email = uppercaseUpdates.email.toUpperCase();
    if (uppercaseUpdates.cpf) uppercaseUpdates.cpf = uppercaseUpdates.cpf.toUpperCase();
    if (uppercaseUpdates.enrollment) uppercaseUpdates.enrollment = uppercaseUpdates.enrollment.toUpperCase();
    setUsers(prev => {
      const updatedList = prev.map(u => u.id === id ? { ...u, ...uppercaseUpdates } : u);
      if (currentUser && currentUser.id === id) {
        const foundUser = updatedList.find(u => u.id === id);
        if (foundUser) {
          setCurrentUser(foundUser);
        }
      }
      return updatedList;
    });
  };

  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    addSecurityLog('USUARIO_REMOVIDO', `Usuário ${userToDelete?.name || ''} (ID: ${id}) foi excluído do sistema.`, 'medium');
  };

  const unifyDuplicateStudents = (principalId: string, duplicateIds: string[]) => {
    const principal = users.find(u => u.id === principalId);
    if (!principal) return;

    // 1. Move all GradeRecord of duplicateIds to principalId
    setGrades(prev => prev.map(g => {
      if (duplicateIds.includes(g.studentId)) {
        return { ...g, studentId: principalId };
      }
      return g;
    }));

    // 2. Move all directAbsences of duplicateIds to principalId
    setDirectAbsences(prev => {
      const updated = { ...prev };
      duplicateIds.forEach(dupId => {
        Object.keys(updated).forEach(key => {
          if (key.endsWith(`_${dupId}`)) {
            const newKey = key.slice(0, -dupId.length - 1) + "_" + principalId;
            updated[newKey] = updated[key];
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // 3. Move all attendance sessions records of duplicateIds to principalId
    setAttendance(prev => prev.map(session => {
      const updatedRecords = { ...session.records };
      let changed = false;
      duplicateIds.forEach(dupId => {
        if (updatedRecords[dupId] !== undefined) {
          const existingValue = updatedRecords[principalId];
          const duplicateValue = updatedRecords[dupId];
          if (existingValue === undefined || (existingValue === 'F' && duplicateValue === 'P')) {
            updatedRecords[principalId] = duplicateValue;
          }
          delete updatedRecords[dupId];
          changed = true;
        }
      });
      return changed ? { ...session, records: updatedRecords } : session;
    }));

    // 4. Move all studentDocuments of duplicateIds to principalId
    setStudentDocuments(prev => prev.map(docRecord => {
      if (duplicateIds.includes(docRecord.studentId)) {
        const newId = docRecord.id.replace(new RegExp(`_${docRecord.studentId}_`), `_${principalId}_`);
        return { ...docRecord, id: newId, studentId: principalId };
      }
      return docRecord;
    }));

    // 5. Move all messages of duplicateIds to principalId
    setMessages(prev => prev.map(msg => {
      if (duplicateIds.includes(msg.recipientId)) {
        return { ...msg, recipientId: principalId };
      }
      return msg;
    }));

    // 6. Move all internships of duplicateIds to principalId
    setInternships(prev => prev.map(intern => {
      if (duplicateIds.includes(intern.studentId)) {
        return { ...intern, studentId: principalId };
      }
      return intern;
    }));

    // 7. Delete duplicates from users
    setUsers(prev => prev.filter(u => !duplicateIds.includes(u.id)));

    // 8. Record a security log
    const duplicatesNames = duplicateIds.map(id => {
      const u = users.find(x => x.id === id);
      return `${u?.name || ''} (ID: ${id})`;
    }).join(', ');

    addSecurityLog(
      'UNIFICACAO_ESTUDANTES',
      `Alunos duplicados unificados no registro principal: ${principal.name} (ID: ${principalId}). Registros removidos: ${duplicatesNames}`,
      'medium'
    );
  };

  const unifyDuplicateSubjects = (correctSubjectId: string, duplicateSubjectIds: string[]) => {
    const correctSubj = subjects.find(s => s.id === correctSubjectId);
    if (!correctSubj) return;

    // 1. Move all GradeRecord of duplicateSubjectIds to correctSubjectId
    setGrades(prev => prev.map(g => {
      if (duplicateSubjectIds.includes(g.subjectId)) {
        return { ...g, subjectId: correctSubjectId };
      }
      return g;
    }));

    // 2. Move all AttendanceSession of duplicateSubjectIds to correctSubjectId
    setAttendance(prev => prev.map(session => {
      if (duplicateSubjectIds.includes(session.subjectId)) {
        return { ...session, subjectId: correctSubjectId };
      }
      return session;
    }));

    // 3. Move directAbsences keys of duplicateSubjectIds to correctSubjectId
    setDirectAbsences(prev => {
      const updated = { ...prev };
      duplicateSubjectIds.forEach(dupId => {
        Object.keys(updated).forEach(key => {
          const parts = key.split('_');
          if (parts.length === 3 && parts[1] === dupId) {
            const newKey = `${parts[0]}_${correctSubjectId}_${parts[2]}`;
            if (updated[newKey] !== undefined) {
              updated[newKey] = Math.max(updated[newKey], updated[key]);
            } else {
              updated[newKey] = updated[key];
            }
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // 4. Update assignedJournals for users (teachers)
    setUsers(prev => prev.map(u => {
      if (u.assignedJournals && u.assignedJournals.length > 0) {
        const updatedJournals = u.assignedJournals.map(j => {
          if (duplicateSubjectIds.includes(j.subjectId)) {
            return { ...j, subjectId: correctSubjectId };
          }
          return j;
        });
        
        // Remove duplicate journals for the same class/subject if they occur
        const uniqueJournals = updatedJournals.filter((journal, index, self) => 
          index === self.findIndex(t => t.classId === journal.classId && t.subjectId === journal.subjectId)
        );
        
        return { ...u, assignedJournals: uniqueJournals };
      }
      return u;
    }));

    // 5. Remove duplicate subjects from subjects list
    setSubjects(prev => prev.filter(s => !duplicateSubjectIds.includes(s.id)));

    // 6. Record a security log
    const duplicateNames = duplicateSubjectIds.map(id => {
      const s = subjects.find(x => x.id === id);
      return `${s?.name || ''} (ID: ${id})`;
    }).join(', ');

    addSecurityLog(
      'UNIFICACAO_DISCIPLINAS',
      `Disciplinas duplicadas unificadas na disciplina principal: ${correctSubj.name} (ID: ${correctSubjectId}). Disciplinas removidas: ${duplicateNames}`,
      'medium'
    );
  };

  const syncSubjectsWithOfficialCurriculum = () => {
    // 1. Map courses to their official counterparts
    const courseIdToOfficial: { [courseId: string]: typeof officialCurriculum[0] } = {};
    courses.forEach(c => {
      const matchedOfficial = officialCurriculum.find(off => cleanTextForSync(off.courseName) === cleanTextForSync(c.name));
      if (matchedOfficial) {
        courseIdToOfficial[c.id] = matchedOfficial;
      }
    });

    // 2. Pre-clean prefixes and find official match for each subject
    const processedSubjects = subjects.map(subj => {
      const originalName = subj.name;
      const cleanName = /^\d+_+/.test(originalName) ? originalName.replace(/^\d+_+/, '').trim() : originalName;
      const official = courseIdToOfficial[subj.courseId];
      let targetName = cleanName;
      let bestScore = -1;
      let isOfficialMatch = false;

      if (official) {
        const officialNames = official.modules[subj.module as 1 | 2 | 3] || [];
        officialNames.forEach(offName => {
          if (isMatchForSync(cleanName, offName)) {
            const score = calculateSimilarityForSync(cleanName, offName);
            if (score > bestScore) {
              bestScore = score;
              targetName = offName;
              isOfficialMatch = true;
            }
          }
        });
      }

      return {
        ...subj,
        originalName,
        cleanName,
        targetName,
        score: isOfficialMatch ? bestScore : 1.0
      };
    });

    // 3. Group by course, module, and targetName to detect duplicates
    const groups: { [key: string]: typeof processedSubjects } = {};
    processedSubjects.forEach(ps => {
      const key = `${ps.courseId}_${ps.module}_${ps.targetName.trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ps);
    });

    // Let's prepare maps of changes
    const renameMap: { [subjectId: string]: string } = {}; // subjectId -> newName
    const mergeMap: { [duplicateSubjectId: string]: string } = {}; // duplicateId -> correctId
    
    const renamedList: { original: string; official: string; id: string }[] = [];
    const unifiedList: { original: string; kept: string; keptId: string; deletedId: string }[] = [];

    // 4. Resolve renames and unifications
    Object.keys(groups).forEach(key => {
      const entries = groups[key];
      if (entries.length === 1) {
        const single = entries[0];
        if (single.originalName !== single.targetName) {
          renameMap[single.id] = single.targetName;
          renamedList.push({ original: single.originalName, official: single.targetName, id: single.id });
        }
      } else if (entries.length > 1) {
        // Sort descending to choose the primary subject:
        // - Prefer the one that doesn't need rename if possible (exact match to targetName)
        // - Prefer the one with more data records to keep history safe
        entries.sort((a, b) => {
          const isExactA = a.originalName === a.targetName ? 1 : 0;
          const isExactB = b.originalName === b.targetName ? 1 : 0;
          if (isExactA !== isExactB) return isExactB - isExactA;

          const dataA = grades.filter(g => g.subjectId === a.id).length + attendance.filter(s => s.subjectId === a.id).length;
          const dataB = grades.filter(g => g.subjectId === b.id).length + attendance.filter(s => s.subjectId === b.id).length;
          if (dataA !== dataB) return dataB - dataA;

          return a.id.localeCompare(b.id);
        });

        const primary = entries[0];
        const duplicates = entries.slice(1);

        duplicates.forEach(dup => {
          mergeMap[dup.id] = primary.id;
          unifiedList.push({ original: dup.originalName, kept: primary.targetName, keptId: primary.id, deletedId: dup.id });
        });

        if (primary.originalName !== primary.targetName) {
          renameMap[primary.id] = primary.targetName;
          renamedList.push({ original: primary.originalName, official: primary.targetName, id: primary.id });
        }
      }
    });

    if (renamedList.length === 0 && unifiedList.length === 0) {
      return { renamed: [], unified: [] };
    }

    // A. Update subjects list
    setSubjects(prev => {
      return prev
        .filter(s => !mergeMap[s.id])
        .map(s => {
          if (renameMap[s.id]) {
            return { ...s, name: renameMap[s.id] };
          }
          return s;
        });
    });

    // B. Update grades
    setGrades(prev => {
      return prev.map(g => {
        if (mergeMap[g.subjectId]) {
          return { ...g, subjectId: mergeMap[g.subjectId] };
        }
        return g;
      });
    });

    // C. Update attendance sessions
    setAttendance(prev => {
      return prev.map(session => {
        if (mergeMap[session.subjectId]) {
          return { ...session, subjectId: mergeMap[session.subjectId] };
        }
        return session;
      });
    });

    // D. Update directAbsences
    setDirectAbsences(prev => {
      const updated = { ...prev };
      Object.keys(mergeMap).forEach(dupId => {
        const correctId = mergeMap[dupId];
        Object.keys(updated).forEach(key => {
          const parts = key.split('_');
          if (parts.length === 3 && parts[1] === dupId) {
            const newKey = `${parts[0]}_${correctId}_${parts[2]}`;
            if (updated[newKey] !== undefined) {
              updated[newKey] = Math.max(updated[newKey], updated[key]);
            } else {
              updated[newKey] = updated[key];
            }
            delete updated[key];
          }
        });
      });
      return updated;
    });

    // E. Update users (assignedJournals)
    setUsers(prev => {
      return prev.map(u => {
        if (u.assignedJournals && u.assignedJournals.length > 0) {
          const updatedJournals = u.assignedJournals.map(j => {
            if (mergeMap[j.subjectId]) {
              return { ...j, subjectId: mergeMap[j.subjectId] };
            }
            return j;
          });
          
          // Remove duplicate journals for the same class/subject if they occur
          const uniqueJournals = updatedJournals.filter((journal, index, self) => 
            index === self.findIndex(t => t.classId === journal.classId && t.subjectId === journal.subjectId)
          );
          
          return { ...u, assignedJournals: uniqueJournals };
        }
        return u;
      });
    });

    // F. Active Subject Id
    if (activeSubjectId && mergeMap[activeSubjectId]) {
      setActiveSubjectId(mergeMap[activeSubjectId]);
    }

    // G. Create Security Logs
    const renameLogs = renamedList.map(r => `"${r.original}" -> "${r.official}"`).join(', ');
    const unifyLogs = unifiedList.map(u => `"${u.original}" unificada em "${u.kept}"`).join(', ');

    let logMessage = "Sincronização com Grade Curricular Oficial concluída.";
    if (renamedList.length > 0) {
      logMessage += ` Disciplinas corrigidas/renomeadas: ${renameLogs}.`;
    }
    if (unifiedList.length > 0) {
      logMessage += ` Disciplinas unificadas: ${unifyLogs}.`;
    }

    addSecurityLog('SINCRONIZACAO_GRADE', logMessage, 'medium');

    return { renamed: renamedList, unified: unifiedList };
  };

  const computeCalculatedGrade = (record: GradeRecord): GradeRecord => {
    const s1 = calculateS1(record);
    const s2 = calculateS2(record);
    const rawAfc = record.afc;
    const afcVal = rawAfc !== null && rawAfc !== undefined ? Math.min(40, rawAfc) : null;
    const extra = record.extra ?? 0;
    const conselho = record.conselho ?? 0;
    const pf = Math.min(100, s1 + s2 + (afcVal ?? 0) + extra + conselho);
    const concept = getStudentConcept(pf, conceptRanges);
    const { frequency } = getStudentAbsences(record.studentId, record.subjectId, record.classId);
    const result = getStudentResult({ pf, extra, conselho, afc: afcVal }, frequency);
    return {
      ...record,
      afc: afcVal,
      s1,
      s2,
      pf,
      concept,
      result
    };
  };

  const createDefaultGradeRecord = (id: string, updates: Partial<GradeRecord>): GradeRecord => {
    let studentId = updates.studentId || '';
    let classId = updates.classId || '';
    let subjectId = updates.subjectId || '';
    if (id.startsWith('grade_')) {
      const parts = id.split('_');
      if (parts.length >= 4) {
        studentId = studentId || parts[1];
        classId = classId || parts[2];
        subjectId = subjectId || parts[3];
      }
    }
    return {
      id,
      studentId,
      classId,
      subjectId,
      av1: null, av2: null, av3: null, recS1: null, s1: 0,
      av4: null, av5: null, av6: null, recS2: null, s2: 0,
      extra: null, conselho: null, afc: null, pf: 0,
      concept: 'E',
      result: 'Pendente',
      ...updates
    };
  };

  const updateGrade = (id: string, updates: Partial<GradeRecord>) => {
    setGrades(prev => {
      const isAfcUpdate = 'afc' in updates;

      if (!isAfcUpdate) {
        const exists = prev.some(g => g.id === id);
        if (exists) {
          return prev.map(g => {
            if (g.id === id) {
              const merged = { ...g, ...updates };
              return computeCalculatedGrade(merged);
            }
            return g;
          });
        } else {
          const newRecord = createDefaultGradeRecord(id, updates);
          return [...prev, computeCalculatedGrade(newRecord)];
        }
      }

      // AFC Update logic: propagate AFC to all subjects of the student in the same module
      const rawAfc = updates.afc;
      const newAfcVal = rawAfc !== null && rawAfc !== undefined ? Math.min(40, rawAfc) : null;

      const existingRecord = prev.find(g => g.id === id);
      let studentId = existingRecord?.studentId || updates.studentId || '';
      let classId = existingRecord?.classId || updates.classId || '';
      let subjectId = existingRecord?.subjectId || updates.subjectId || '';

      if ((!studentId || !classId) && id.startsWith('grade_')) {
        const parts = id.split('_');
        if (parts.length >= 4) {
          studentId = studentId || parts[1];
          classId = classId || parts[2];
          subjectId = subjectId || parts[3];
        }
      }

      const studentUser = users.find(u => u.id === studentId);
      classId = classId || studentUser?.classId || '';

      if (!studentId) {
        // Fallback if studentId cannot be determined
        const exists = prev.some(g => g.id === id);
        if (exists) {
          return prev.map(g => g.id === id ? computeCalculatedGrade({ ...g, ...updates, afc: newAfcVal }) : g);
        } else {
          const newRecord = createDefaultGradeRecord(id, { ...updates, afc: newAfcVal });
          return [...prev, computeCalculatedGrade(newRecord)];
        }
      }

      const targetClass = classes.find(c => c.id === classId);
      const moduleSubjects = targetClass
        ? subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module)
        : [];
      const moduleSubjectIds = new Set(moduleSubjects.map(s => s.id));

      const updatedPrev = prev.map(g => {
        const isTargetStudent = g.studentId === studentId;
        const isSameClassOrModule = (targetClass && g.classId === targetClass.id) || moduleSubjectIds.has(g.subjectId) || g.id === id;

        if (isTargetStudent && isSameClassOrModule) {
          const merged = g.id === id 
            ? { ...g, ...updates, afc: newAfcVal }
            : { ...g, afc: newAfcVal };
          return computeCalculatedGrade(merged);
        }
        return g;
      });

      if (targetClass) {
        const existingSubjectIds = new Set(
          updatedPrev
            .filter(g => g.studentId === studentId && (g.classId === targetClass.id || moduleSubjectIds.has(g.subjectId)))
            .map(g => g.subjectId)
        );

        const newRecordsToAppend: GradeRecord[] = [];
        moduleSubjects.forEach(sub => {
          if (!existingSubjectIds.has(sub.id)) {
            const newRecId = `grade_${studentId}_${targetClass.id}_${sub.id}`;
            const defaultRec = createDefaultGradeRecord(newRecId, {
              studentId,
              classId: targetClass.id,
              subjectId: sub.id,
              afc: newAfcVal
            });
            newRecordsToAppend.push(computeCalculatedGrade(defaultRec));
          }
        });

        return [...updatedPrev, ...newRecordsToAppend];
      }

      return updatedPrev;
    });
  };

  const updateConceptRanges = (ranges: ConceptRange[]) => {
    setConceptRanges(ranges);
  };

  // Period Management
  const addPeriod = (period: string) => {
    if (!periods.includes(period)) {
      setPeriods(prev => {
        const updated = [...prev, period].sort();
        safeLocalStorage.setItem('oc_periods', JSON.stringify(updated));
        return updated;
      });
      addSecurityLog('PERIODO_CRIADO', `Novo período letivo criado: ${period}`, 'low');
    }
  };

  // Admin DB controls
  const wipeAllData = () => {
    // Keep only administrative users
    const cleanUsers = users.filter(u => u.role === UserRole.ADMIN);
    setUsers(cleanUsers);
    safeLocalStorage.setItem('oc_users', JSON.stringify(cleanUsers));

    // Empty grades and attendance diaries
    setGrades([]);
    safeLocalStorage.setItem('oc_grades', JSON.stringify([]));

    setAttendance([]);
    safeLocalStorage.setItem('oc_attendance', JSON.stringify([]));

    // Clear notifications and messages
    setNotifications([]);
    safeLocalStorage.setItem('oc_notifications', JSON.stringify([]));

    setMessages([]);
    safeLocalStorage.setItem('oc_messages', JSON.stringify([]));

    setActiveClassId('class_enf_m1_matutino');
    setActiveSubjectId('enf_m1_anatomia');

    addSecurityLog('BANCO_LIMPO', 'Exclusão completa de alunos, professores, diários, matrículas e lançamentos efetuada com sucesso.', 'high');
  };

  const loadDemoData = () => {
    const demo = getDemoDataToLoad();
    
    // Merge users, keeping admin
    setUsers(prev => {
      const admins = prev.filter(u => u.role === UserRole.ADMIN);
      const merged = [...admins, ...demo.users];
      safeLocalStorage.setItem('oc_users', JSON.stringify(merged));
      return merged;
    });

    setGrades(demo.grades);
    safeLocalStorage.setItem('oc_grades', JSON.stringify(demo.grades));

    setAttendance(demo.attendance);
    safeLocalStorage.setItem('oc_attendance', JSON.stringify(demo.attendance));

    setActiveClassId('class_enf_m1_matutino');
    setActiveSubjectId('enf_m1_anatomia');

    addSecurityLog('BANCO_DEMO_SEED', 'Massa de dados de teste (professores, alunos, notas e frequências) carregada com sucesso.', 'high');
  };

  // Attendance Session Mutators
  const saveAttendanceSession = (session: AttendanceSession) => {
    const uppercaseSession = {
      ...session,
      topic: session.topic.toUpperCase(),
      records: Object.keys(session.records).reduce((acc, studentId) => {
        acc[studentId] = session.records[studentId].toUpperCase() as 'P' | 'F';
        return acc;
      }, {} as { [studentId: string]: 'P' | 'F' })
    };
    setAttendance(prev => prev.map(s => s.id === session.id ? uppercaseSession : s));
  };

  const addAttendanceSession = (session: Omit<AttendanceSession, 'id'>) => {
    const newSession: AttendanceSession = {
      ...session,
      id: `att_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      topic: session.topic.toUpperCase(),
      records: Object.keys(session.records).reduce((acc, studentId) => {
        acc[studentId] = session.records[studentId].toUpperCase() as 'P' | 'F';
        return acc;
      }, {} as { [studentId: string]: 'P' | 'F' })
    };
    setAttendance(prev => [...prev, newSession]);
  };

  // S1/S2 journal closing toggling
  const toggleJournalStatus = (classId: string, type: 'S1' | 'S2' | 'Definitive') => {
    setClasses(prev => prev.map(c => {
      if (c.id === classId) {
        if (type === 'S1') return { ...c, closedS1: !c.closedS1 };
        if (type === 'S2') return { ...c, closedS2: !c.closedS2 };
        if (type === 'Definitive') return { ...c, closedDefinitive: !c.closedDefinitive };
      }
      return c;
    }));
  };

  // Messages & Notifications
  const sendMessage = (
    senderName: string, 
    senderRole: UserRole, 
    recipientId: string, 
    content: string,
    attachmentUrl?: string,
    attachmentType?: 'audio' | 'pdf' | 'image',
    attachmentName?: string
  ) => {
    const uppercaseContent = content.toUpperCase();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderName: senderName.toUpperCase(),
      senderRole,
      recipientId,
      content: uppercaseContent,
      date: new Date().toISOString(),
      attachmentUrl,
      attachmentType,
      attachmentName
    };
    setMessages(prev => [newMsg, ...prev]);

    // Send notifications to recipient
    const hasAttachmentText = attachmentType ? ` [ANEXO ${attachmentType.toUpperCase()}]` : '';
    if (recipientId === 'ALL_TEACHERS') {
      users.filter(u => u.role === UserRole.TEACHER).forEach(t => {
        addNotification(t.id, `Nova mensagem de coordenação:${hasAttachmentText} "${uppercaseContent.substring(0, 60)}${uppercaseContent.length > 60 ? '...' : ''}"`);
      });
    } else {
      addNotification(recipientId, `Mensagem de ${senderName.toUpperCase()}:${hasAttachmentText} "${uppercaseContent.substring(0, 100)}${uppercaseContent.length > 100 ? '...' : ''}"`);
    }
  };

  const addNotification = (userId: string, content: string) => {
    const newNot: AcademicNotification = {
      id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      content,
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNot, ...prev]);
  };

  const clearNotifications = (userId: string) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, read: true } : n));
  };

  // Bulk Importers
  const importStudents = (studentList: { name: string, enrollment: string, email: string }[], targetClassId: string) => {
    const cls = classes.find(c => c.id === targetClassId);
    if (!cls) return;

    const newUsers: User[] = [];
    const newGrades: GradeRecord[] = [];
    const existingUserUpdates: Record<string, Partial<User>> = {};

    studentList.forEach(std => {
      // Check if user already exists in current state or already accumulated in this batch
      let exists = users.find(u => u.enrollment === std.enrollment) || newUsers.find(u => u.enrollment === std.enrollment);
      let isMatchedByName = false;

      const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

      if (!exists) {
        const normStdName = normalizeName(std.name);
        const matchedUser = users.find(u => u.role === UserRole.STUDENT && u.name && normalizeName(u.name) === normStdName) ||
                            newUsers.find(u => u.role === UserRole.STUDENT && u.name && normalizeName(u.name) === normStdName);
        if (matchedUser) {
          exists = matchedUser;
          isMatchedByName = true;
        }
      }

      let studentUserId = exists?.id;

      if (!exists) {
        studentUserId = `std_imp_${Date.now()}_${std.enrollment}`;
        const newStud: User = {
          id: studentUserId,
          name: std.name.toUpperCase(),
          username: std.enrollment,
          email: std.email || `${std.enrollment}@aluno.oc.com`,
          role: UserRole.STUDENT,
          enrollment: std.enrollment,
          active: true,
          classId: cls.id
        };
        newUsers.push(newStud);
      } else {
        const currentEffectiveClassId = existingUserUpdates[exists.id]?.classId !== undefined 
          ? existingUserUpdates[exists.id]?.classId 
          : exists.classId;

        let shouldUpdateClassId = false;
        if (!currentEffectiveClassId) {
          shouldUpdateClassId = true;
        } else {
          const currentClass = classes.find(c => c.id === currentEffectiveClassId);
          if (!currentClass || (currentClass.year === cls.year && currentClass.semester === cls.semester)) {
            shouldUpdateClassId = true;
          }
        }

        if (isMatchedByName) {
          const updatedEmail = std.email || exists.email || `${std.enrollment}@aluno.oc.com`;
          const updateObj: Partial<User> = {
            enrollment: std.enrollment,
            username: std.enrollment,
            email: updatedEmail,
            active: true
          };
          if (shouldUpdateClassId) {
            updateObj.classId = cls.id;
          }
          existingUserUpdates[exists.id] = {
            ...existingUserUpdates[exists.id],
            ...updateObj
          };
          const inNewUsers = newUsers.find(u => u.id === exists.id);
          if (inNewUsers) {
            inNewUsers.enrollment = std.enrollment;
            inNewUsers.username = std.enrollment;
            inNewUsers.email = updatedEmail;
            if (shouldUpdateClassId) {
              inNewUsers.classId = cls.id;
            }
          }
        } else {
          const updateObj: Partial<User> = { active: true };
          if (shouldUpdateClassId) {
            updateObj.classId = cls.id;
          }
          existingUserUpdates[exists.id] = {
            ...existingUserUpdates[exists.id],
            ...updateObj
          };
        }
      }

      // Automatically distribute this student to all subjects of the target class
      const classSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);
      classSubjects.forEach(sub => {
        const gradeExists = grades.find(g => g.classId === cls.id && g.subjectId === sub.id && g.studentId === studentUserId) ||
                            newGrades.find(g => g.classId === cls.id && g.subjectId === sub.id && g.studentId === studentUserId);
        if (!gradeExists) {
          const newGrade: GradeRecord = {
            id: `g_imp_${Date.now()}_${sub.id}_${studentUserId}`,
            classId: cls.id,
            subjectId: sub.id,
            studentId: studentUserId!,
            av1: null, av2: null, av3: null, recS1: null, s1: 0,
            av4: null, av5: null, av6: null, recS2: null, s2: 0,
            extra: null, conselho: null, afc: null, pf: 0,
            concept: 'D',
            result: 'Pendente'
          };
          newGrades.push(newGrade);
        }
      });
    });

    // Update users in a single state change
    setUsers(prev => {
      const updatedPrev = prev.map(u => {
        if (existingUserUpdates[u.id]) {
          return { ...u, ...existingUserUpdates[u.id] };
        }
        return u;
      });
      const existingIds = new Set(updatedPrev.map(u => u.id));
      const filteredNewUsers = newUsers.filter(u => !existingIds.has(u.id));
      return [...updatedPrev, ...filteredNewUsers];
    });

    if (newGrades.length > 0) {
      setGrades(prev => {
        // Filter out any duplicate grade records that might have been added to the state concurrently
        const existingKeys = new Set(prev.map(g => `${g.classId}_${g.subjectId}_${g.studentId}`));
        const filteredNewGrades = newGrades.filter(g => !existingKeys.has(`${g.classId}_${g.subjectId}_${g.studentId}`));
        return [...prev, ...filteredNewGrades];
      });
    }
  };

  const importSubjects = (subjectList: { name: string, workload: number }[], courseId: string, module: number) => {
    subjectList.forEach(sub => {
      const exists = subjects.find(s => s.name.toUpperCase() === sub.name.toUpperCase() && s.courseId === courseId);
      if (!exists) {
        const newSub: Subject = {
          id: `sub_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: sub.name.toUpperCase(),
          courseId,
          module,
          workload: sub.workload
        };
        addSubject(newSub);
      }
    });
  };

  const importConcepts = (conceptList: ConceptRange[]) => {
    setConceptRanges(conceptList);
  };

  const importHistoricalData = (jsonData: any, targetPeriod?: string): HistoricalImportSummary => {
    if (!jsonData || !Array.isArray(jsonData.classes)) {
      throw new Error("Formato inválido: O JSON deve conter um array 'classes'.");
    }

    let coursesCreated = 0;
    let classesCreated = 0;
    let subjectsCreated = 0;
    let studentsCreated = 0;
    let studentsRecognized = 0;
    let gradesImported = 0;

    let currentCourses = [...courses];
    let currentClasses = [...classes];
    let currentSubjects = [...subjects];
    let currentUsers = [...users];
    let currentGrades = [...grades];
    let currentPeriods = [...periods];
    let currentDirectAbsences = { ...directAbsences };
    const recognizedStudentIds = new Set<string>();
    const createdStudentIds = new Set<string>();

    jsonData.classes.forEach((clsItem: any) => {
      const { className, courseName, shift, module: clsModule, year, semester, subjects: clsSubjects } = clsItem;

      const activeTargetPeriod = targetPeriod || currentPeriod;
      const [pYear, pSem] = activeTargetPeriod.split('/');
      const targetYear = targetPeriod ? (parseInt(pYear) || Number(year) || 2026) : (Number(year) || parseInt(pYear) || 2026);
      const targetSemester = targetPeriod ? (parseInt(pSem) || Number(semester) || 1) : (Number(semester) || parseInt(pSem) || 1);

      // 1. Course Check / Creation
      // NOTE: use cleanTextForSync (accent/whitespace/case-insensitive) instead of a plain
      // trim+lowercase compare. Mapas convertidos de PDF frequentemente têm pequenas
      // variações de acentuação/espaçamento entre arquivos para o mesmo curso/turma/disciplina,
      // e uma comparação frágil aqui cria registros duplicados "fantasma".
      let course = currentCourses.find(c => cleanTextForSync(c.name) === cleanTextForSync(courseName));
      if (!course) {
        course = {
          id: `crs_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: courseName.toUpperCase().trim(),
          description: `CURSO IMPORTADO ${courseName.toUpperCase().trim()}`
        };
        currentCourses.push(course);
        coursesCreated++;
      }

      // 2. ClassSection Check / Creation
      let classSection = currentClasses.find(c => 
        cleanTextForSync(c.name) === cleanTextForSync(className) &&
        c.year === targetYear &&
        c.semester === targetSemester &&
        c.module === Number(clsModule)
      );
      if (!classSection) {
        classSection = {
          id: `class_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: className.toUpperCase().trim(),
          code: `IMP-${targetYear}-${targetSemester}-${clsModule}`,
          courseId: course.id,
          shift: (shift as Shift) || Shift.MATUTINO,
          module: Number(clsModule),
          year: targetYear,
          semester: targetSemester,
          closedS1: false,
          closedS2: false,
          closedDefinitive: false,
          isImported: true
        };
        currentClasses.push(classSection);
        classesCreated++;
      }

      // 3. Period check/creation
      const periodStr = `${targetYear}/${targetSemester}`;
      if (!currentPeriods.includes(periodStr)) {
        currentPeriods.push(periodStr);
      }

      // 4. For each subject within the class
      if (Array.isArray(clsSubjects)) {
        clsSubjects.forEach((subItem: any) => {
          const { subjectName, records } = subItem;
          let subject = currentSubjects.find(s => 
            cleanTextForSync(s.name) === cleanTextForSync(subjectName) &&
            s.courseId === course!.id &&
            s.module === Number(clsModule)
          );
          if (!subject) {
            subject = {
              id: `sub_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: subjectName.toUpperCase().trim(),
              courseId: course!.id,
              module: Number(clsModule),
              workload: 80
            };
            currentSubjects.push(subject);
            subjectsCreated++;
          }

          // 5. For each record within the subject
          if (Array.isArray(records)) {
            records.forEach((recItem: any) => {
              const { studentName, studentEnrollment, av1, av4, s1, s2, afc, extra, conselho, pf, faltas, concept, result } = recItem;

              let student: any = null;
              if (studentEnrollment && typeof studentEnrollment === 'string' && studentEnrollment.trim() !== '') {
                student = currentUsers.find(u => 
                  u.role === UserRole.STUDENT && 
                  u.enrollment === studentEnrollment.trim()
                );
              }

              if (!student) {
                // Use the accent/whitespace-insensitive comparator here too, for the same
                // reason as course/class/subject above: names converted from different PDF
                // mapas can carry small accent/spacing differences for the same person.
                const cleanedTargetName = cleanTextForSync(studentName);
                student = currentUsers.find(u => 
                  u.role === UserRole.STUDENT && 
                  cleanTextForSync(u.name) === cleanedTargetName
                );
              }

              let studentId = '';
              if (student) {
                studentId = student.id;
                // Count unique students only once, even though this record loop runs once per
                // (student, subject) pair — otherwise "Alunos Reconhecidos"/"Novos Alunos" in the
                // import summary double (or eleven-, or N-) counts each student per subject.
                if (!recognizedStudentIds.has(studentId)) {
                  recognizedStudentIds.add(studentId);
                  studentsRecognized++;
                }
              } else {
                studentId = `std_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                
                const normalizedUsername = studentName
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9 ]/g, "")
                  .trim()
                  .replace(/\s+/g, ".");

                const finalUsername = `${normalizedUsername}.${Math.floor(100 + Math.random() * 900)}`;
                
                student = {
                  id: studentId,
                  name: studentName.toUpperCase().trim(),
                  username: finalUsername,
                  email: `${normalizedUsername}@historico.oc.com`,
                  role: UserRole.STUDENT,
                  active: true,
                  classId: classSection!.id,
                  enrollment: studentEnrollment && typeof studentEnrollment === 'string' && studentEnrollment.trim() !== '' ? studentEnrollment.trim() : undefined
                };
                currentUsers.push(student);
                if (!createdStudentIds.has(studentId)) {
                  createdStudentIds.add(studentId);
                  studentsCreated++;
                }
              }

              // 6. GradeRecord Check / Creation / Update
              const existingGradeIndex = currentGrades.findIndex(g => 
                g.studentId === studentId &&
                g.subjectId === subject!.id &&
                g.classId === classSection!.id
              );

              if (existingGradeIndex !== -1) {
                // IMPORTANT: build a brand-new object instead of mutating the existing one in
                // place. currentGrades is only a shallow copy of the previous `grades` state,
                // so mutating a found record here would also mutate the object still referenced
                // by the outgoing React state, which can cause stale/inconsistent renders.
                currentGrades[existingGradeIndex] = {
                  ...currentGrades[existingGradeIndex],
                  av1: av1 !== null && av1 !== undefined ? Number(av1) : null,
                  av4: av4 !== null && av4 !== undefined ? Number(av4) : null,
                  s1: Number(s1),
                  s2: Number(s2),
                  afc: afc !== null ? Number(afc) : null,
                  extra: extra !== null ? Number(extra) : null,
                  conselho: conselho !== null ? Number(conselho) : null,
                  pf: Number(pf),
                  concept: concept || 'D',
                  result: result as any || 'Pendente'
                };
              } else {
                const gradeRecord = {
                  id: `g_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  studentId,
                  subjectId: subject!.id,
                  classId: classSection!.id,
                  av1: av1 !== null && av1 !== undefined ? Number(av1) : null,
                  av2: null, av3: null, recS1: null, s1: Number(s1),
                  av4: av4 !== null && av4 !== undefined ? Number(av4) : null,
                  av5: null, av6: null, recS2: null, s2: Number(s2),
                  afc: afc !== null ? Number(afc) : null,
                  extra: extra !== null ? Number(extra) : null,
                  conselho: conselho !== null ? Number(conselho) : null,
                  pf: Number(pf),
                  concept: concept || 'D',
                  result: result as any || 'Pendente'
                };
                currentGrades.push(gradeRecord);
              }
              gradesImported++;

              // 7. Absences Register
              const absenceKey = `${classSection!.id}_${subject!.id}_${studentId}`;
              currentDirectAbsences[absenceKey] = Number(faltas || 0);
            });
          }
        });
      }
    });

    setCourses(currentCourses);
    setClasses(currentClasses);
    setSubjects(currentSubjects);
    setUsers(currentUsers);
    setGrades(currentGrades);
    setPeriods(currentPeriods);
    setDirectAbsences(currentDirectAbsences);

    safeLocalStorage.setItem('oc_courses', JSON.stringify(currentCourses));
    safeLocalStorage.setItem('oc_classes', JSON.stringify(currentClasses));
    safeLocalStorage.setItem('oc_subjects', JSON.stringify(currentSubjects));
    safeLocalStorage.setItem('oc_users', JSON.stringify(currentUsers));
    safeLocalStorage.setItem('oc_grades', JSON.stringify(currentGrades));
    safeLocalStorage.setItem('oc_periods', JSON.stringify(currentPeriods));
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(currentDirectAbsences));

    addSecurityLog(
      'IMPORTACAO_HISTORICA', 
      `Importação de dados históricos finalizada: ${classesCreated} turmas, ${subjectsCreated} disciplinas, ${studentsCreated} novos alunos, ${studentsRecognized} alunos reconhecidos, ${gradesImported} notas importadas.`, 
      'medium'
    );

    return {
      coursesCreated,
      classesCreated,
      subjectsCreated,
      studentsCreated,
      studentsRecognized,
      gradesImported
    };
  };

  // Repara duplicatas de turmas/disciplinas/alunos criadas por importações históricas
  // anteriores (antes da comparação de nomes ter sido corrigida para ignorar acentos e
  // espaçamento). Nunca apaga notas: sempre funde o registro "fantasma" no oficial,
  // movendo notas/faltas/matrículas de volta para o registro correto.
  const repairDuplicateImports = (): DataRepairSummary => {
    const details: string[] = [];
    let gradesReattached = 0;

    let currentClasses = [...classes];
    let currentSubjects = [...subjects];
    let currentUsers = [...users];
    let currentGrades = [...grades];
    let currentDirectAbsences: { [key: string]: number } = { ...directAbsences };

    const countGradesFor = (predicate: (g: any) => boolean) => currentGrades.filter(predicate).length;

    // Escolhe o registro "canônico" de um grupo de duplicatas. Prioridade:
    // 1) um id que NÃO tenha sido criado por importação histórica (sem prefixo *_hist_/*_imp_)
    //    — normalmente é o cadastro oficial/curricular, com nome limpo e metadados corretos;
    // 2) em empate (ex.: duas duplicatas criadas por importações diferentes), o que tem mais
    //    notas associadas, por ser o mais provável de estar realmente em uso.
    // A contagem de notas NUNCA deve vencer sobre "é o registro oficial", senão o reparo
    // mantém o id/nome "fantasma" só porque ele foi o que acumulou a nota por engano.
    const pickCanonical = <T extends { id: string }>(group: T[], gradeCountFor: (item: T) => number): T => {
      return [...group].sort((a, b) => {
        const aHist = /_(hist|imp)_/.test(a.id) ? 1 : 0;
        const bHist = /_(hist|imp)_/.test(b.id) ? 1 : 0;
        if (aHist !== bHist) return aHist - bHist;
        return gradeCountFor(b) - gradeCountFor(a);
      })[0];
    };

    // --- 1. Turmas duplicadas (mesmo curso, ano, semestre, módulo e nome equivalente) ---
    const classGroups = new Map<string, ClassSection[]>();
    currentClasses.forEach(c => {
      const key = `${c.courseId}|${c.year}|${c.semester}|${c.module}|${cleanTextForSync(c.name)}`;
      if (!classGroups.has(key)) classGroups.set(key, []);
      classGroups.get(key)!.push(c);
    });

    let classesMerged = 0;
    classGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonical(group, (c) => countGradesFor(g => g.classId === c.id));
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.classId === dup.id).length;
        currentGrades = currentGrades.map(g => g.classId === dup.id ? { ...g, classId: canonical.id } : g);
        currentUsers = currentUsers.map(u => u.classId === dup.id ? { ...u, classId: canonical.id } : u);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.startsWith(`${dup.id}_`)) {
            const rest = key.slice(dup.id.length);
            currentDirectAbsences[`${canonical.id}${rest}`] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentClasses = currentClasses.filter(c => c.id !== dup.id);
        gradesReattached += movedGrades;
        classesMerged++;
        details.push(`Turma duplicada "${dup.name}" (${dup.id}) fundida em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) e alunos realocados.`);
      });
    });

    // --- 2. Disciplinas duplicadas (mesmo curso, módulo e nome equivalente) ---
    const subjectGroups = new Map<string, Subject[]>();
    currentSubjects.forEach(s => {
      const key = `${s.courseId}|${s.module}|${cleanTextForSync(s.name)}`;
      if (!subjectGroups.has(key)) subjectGroups.set(key, []);
      subjectGroups.get(key)!.push(s);
    });

    let subjectsMerged = 0;
    subjectGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonical(group, (s) => countGradesFor(g => g.subjectId === s.id));
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.subjectId === dup.id).length;
        currentGrades = currentGrades.map(g => g.subjectId === dup.id ? { ...g, subjectId: canonical.id } : g);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.includes(`_${dup.id}_`)) {
            const newKey = key.replace(`_${dup.id}_`, `_${canonical.id}_`);
            currentDirectAbsences[newKey] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentSubjects = currentSubjects.filter(s => s.id !== dup.id);
        gradesReattached += movedGrades;
        subjectsMerged++;
        details.push(`Disciplina duplicada "${dup.name}" (${dup.id}) fundida em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) realocadas.`);
      });
    });

    // --- 3. Alunos duplicados (mesma matrícula, ou mesmo nome quando não há matrícula) ---
    // Alunos usam uma regra própria de "quem é o canônico", diferente de turma/disciplina:
    // - std_hist_*  → criado às pressas pelo importador de notas históricas quando não achou
    //                 ninguém correspondente; é o candidato mais provável a ser o "fantasma".
    // - std_imp_*   → criado pela importação da planilha oficial de alunos/matrículas
    //                 (Alunos_e_Matriculas), já tem usuário/matrícula formais.
    // - qualquer outro → cadastro manual/admin, o mais oficial de todos.
    // Isso evita, por exemplo, apagar por engano a conta "oficial" de um aluno (com login já
    // em uso) só porque a conta "fantasma" acumulou mais notas.
    const studentTier = (id: string): number => {
      if (id.startsWith('std_hist_')) return 2;
      if (id.startsWith('std_imp_')) return 1;
      return 0;
    };
    const pickCanonicalStudent = (group: User[]): User => {
      return [...group].sort((a, b) => {
        const tierDiff = studentTier(a.id) - studentTier(b.id);
        if (tierDiff !== 0) return tierDiff;
        const aHasEnrollment = a.enrollment && a.enrollment.trim() !== '' ? 0 : 1;
        const bHasEnrollment = b.enrollment && b.enrollment.trim() !== '' ? 0 : 1;
        if (aHasEnrollment !== bHasEnrollment) return aHasEnrollment - bHasEnrollment;
        return countGradesFor(g => g.studentId === b.id) - countGradesFor(g => g.studentId === a.id);
      })[0];
    };

    const studentGroups = new Map<string, User[]>();
    currentUsers.filter(u => u.role === UserRole.STUDENT).forEach(u => {
      const key = u.enrollment && u.enrollment.trim() !== ''
        ? `enr:${u.enrollment.trim()}`
        : `name:${cleanTextForSync(u.name)}`;
      if (!studentGroups.has(key)) studentGroups.set(key, []);
      studentGroups.get(key)!.push(u);
    });

    let studentsMerged = 0;
    studentGroups.forEach(group => {
      if (group.length < 2) return;
      const canonical = pickCanonicalStudent(group);
      group.forEach(dup => {
        if (dup.id === canonical.id) return;
        const movedGrades = currentGrades.filter(g => g.studentId === dup.id).length;
        currentGrades = currentGrades.map(g => g.studentId === dup.id ? { ...g, studentId: canonical.id } : g);
        Object.keys(currentDirectAbsences).forEach(key => {
          if (key.endsWith(`_${dup.id}`)) {
            const newKey = key.slice(0, -dup.id.length) + canonical.id;
            currentDirectAbsences[newKey] = currentDirectAbsences[key];
            delete currentDirectAbsences[key];
          }
        });
        currentUsers = currentUsers.filter(u => u.id !== dup.id);
        gradesReattached += movedGrades;
        studentsMerged++;
        details.push(`Aluno duplicado "${dup.name}" (${dup.id}) fundido em "${canonical.name}" (${canonical.id}) — ${movedGrades} nota(s) realocadas.`);
      });
    });

    if (classesMerged || subjectsMerged || studentsMerged) {
      setClasses(currentClasses);
      setSubjects(currentSubjects);
      setUsers(currentUsers);
      setGrades(currentGrades);
      setDirectAbsences(currentDirectAbsences);

      safeLocalStorage.setItem('oc_classes', JSON.stringify(currentClasses));
      safeLocalStorage.setItem('oc_subjects', JSON.stringify(currentSubjects));
      safeLocalStorage.setItem('oc_users', JSON.stringify(currentUsers));
      safeLocalStorage.setItem('oc_grades', JSON.stringify(currentGrades));
      safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(currentDirectAbsences));

      addSecurityLog(
        'REPARO_IMPORTACAO',
        `Reparo de duplicatas: ${classesMerged} turma(s), ${subjectsMerged} disciplina(s), ${studentsMerged} aluno(s) fundidos, ${gradesReattached} nota(s) realocadas.`,
        'medium'
      );
    } else {
      details.push('Nenhuma duplicata encontrada.');
    }

    return { classesMerged, subjectsMerged, studentsMerged, gradesReattached, details };
  };

  const undoHistoricalImports = (): { removedClassesCount: number; removedStudentsCount: number; removedGradesCount: number } => {
    // 1. Identificar todas as ClassSection importadas ou históricas
    const historicalClasses = classes.filter(c => c.isImported === true || c.closedDefinitive === true || c.code?.startsWith('HIST-') || c.code?.startsWith('IMP-'));
    const historicalClassIds = new Set(historicalClasses.map(c => c.id));
    const removedClassesCount = historicalClasses.length;

    // 2. Remover todos os GradeRecord vinculados a essas turmas
    const initialGradesCount = grades.length;
    const remainingGrades = grades.filter(g => !historicalClassIds.has(g.classId));
    const removedGradesCount = initialGradesCount - remainingGrades.length;

    // 3. Remover chaves de directAbsences que contenham o classId de turmas históricas
    const remainingDirectAbsences: { [key: string]: number } = { ...directAbsences };
    Object.keys(remainingDirectAbsences).forEach(key => {
      const classId = key.split('_')[0];
      if (historicalClassIds.has(classId)) {
        delete remainingDirectAbsences[key];
      }
    });

    // 4. Remover as turmas históricas da lista de turmas
    const remainingClasses = classes.filter(c => !historicalClassIds.has(c.id));

    // 5. Remover alunos (User role: STUDENT) que só tinham vínculo com essas turmas históricas
    const initialUsersCount = users.length;
    const remainingUsers = users.filter(user => {
      if (user.role !== UserRole.STUDENT) {
        return true; // Preserva administradores, professores, etc.
      }
      const isLinkedToHistoricalClass = user.classId ? historicalClassIds.has(user.classId) : false;
      const hasRemainingGradesOutside = remainingGrades.some(g => g.studentId === user.id);

      // Se a turma atual dele for uma das turmas históricas removidas E ele não tiver nenhuma outra nota fora delas:
      if (isLinkedToHistoricalClass && !hasRemainingGradesOutside) {
        return false; // Remove o usuário
      }
      return true; // Mantém o usuário
    });
    const removedStudentsCount = initialUsersCount - remainingUsers.length;

    // 6. Atualizar os estados do sistema e o localStorage
    setClasses(remainingClasses);
    setGrades(remainingGrades);
    setUsers(remainingUsers);
    setDirectAbsences(remainingDirectAbsences);

    safeLocalStorage.setItem('oc_classes', JSON.stringify(remainingClasses));
    safeLocalStorage.setItem('oc_grades', JSON.stringify(remainingGrades));
    safeLocalStorage.setItem('oc_users', JSON.stringify(remainingUsers));
    safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(remainingDirectAbsences));

    addSecurityLog(
      'DESFAZER_IMPORTACAO_HISTORICA',
      `Remoção de importações históricas realizada: ${removedClassesCount} turma(s), ${removedStudentsCount} aluno(s) e ${removedGradesCount} nota(s) removidas.`,
      'medium'
    );

    return {
      removedClassesCount,
      removedStudentsCount,
      removedGradesCount
    };
  };

  const updateDeclarationConfig = (type: 'escolaridade' | 'ctransp', fields: { startDate: string, endDate: string }) => {
    setDeclarationConfigs(prev => ({
      ...prev,
      [type]: fields
    }));
    addSecurityLog('CONFIG_DECLARACAO', `Configurações da declaração de ${type === 'escolaridade' ? 'Escolaridade' : 'SETRANSP Passe'} atualizadas: ${fields.startDate} a ${fields.endDate}`, 'low');
  };

  const updateStudentDocumentStatus = (id: string, status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE', fileUrl?: string, fileName?: string) => {
    setStudentDocuments(prev => {
      const exists = prev.some(doc => doc.id === id);
      if (exists) {
        return prev.map(doc => {
          if (doc.id === id) {
            return {
              ...doc,
              status,
              fileUrl: fileUrl !== undefined ? fileUrl : doc.fileUrl,
              fileName: fileName !== undefined ? fileName : doc.fileName,
              uploadedAt: status === 'ENVIADO' ? new Date().toISOString() : doc.uploadedAt
            };
          }
          return doc;
        });
      } else {
        // Create new
        const parts = id.split('_');
        const studentId = parts[1] || '';
        const name = parts.slice(2).join('_') || '';
        return [...prev, {
          id,
          studentId,
          name,
          status,
          fileUrl,
          fileName,
          uploadedAt: status === 'ENVIADO' ? new Date().toISOString() : undefined
        }];
      }
    });
  };

  const updateInternshipRecord = (
    studentId: string,
    subjectName: string,
    workload: number,
    location: string,
    grade: number | null
  ) => {
    setInternships(prev => {
      const recordId = `int_${studentId}_${subjectName.replace(/\s+/g, '_')}`;
      const exists = prev.some(r => r.id === recordId || (r.studentId === studentId && r.subjectName === subjectName));
      const now = new Date().toISOString();

      if (exists) {
        return prev.map(r => {
          if (r.id === recordId || (r.studentId === studentId && r.subjectName === subjectName)) {
            return {
              ...r,
              workload,
              location,
              grade,
              updatedAt: now
            };
          }
          return r;
        });
      } else {
        return [...prev, {
          id: recordId,
          studentId,
          subjectName,
          workload,
          location,
          grade,
          updatedAt: now
        }];
      }
    });

    addSecurityLog(
      'ESTAGIO_LANCADO',
      `Lançamento/atualização de estágio feito para o aluno ID ${studentId}: Componente [${subjectName}], Local [${location || 'Sem local'}], Nota [${grade !== null ? grade : 'Pendente'}].`,
      'low'
    );
  };

  const transferStudent = (studentId: string, targetClassId: string) => {
    const student = users.find(u => u.id === studentId);
    if (!student) return;

    const oldClassId = student.classId;
    const oldClass = classes.find(c => c.id === oldClassId);
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) return;

    // Get courses & subjects
    const oldSubjects = oldClass ? subjects.filter(s => s.courseId === oldClass.courseId && s.module === oldClass.module) : [];
    const newSubjects = subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module);

    // Filter grades
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const oldGrades = studentGrades.filter(g => g.classId === oldClassId);

    // Create new GradeRecords, migrating matching subjects
    const targetGrades = newSubjects.map(sub => {
      const matchedOldGrade = oldGrades.find(og => og.subjectId === sub.id);
      const newGradeId = `grade_${studentId}_${targetClassId}_${sub.id}`;
      
      if (matchedOldGrade) {
        return {
          ...matchedOldGrade,
          id: newGradeId,
          classId: targetClassId
        };
      } else {
        return {
          id: newGradeId,
          subjectId: sub.id,
          classId: targetClassId,
          studentId: studentId,
          av1: null, av2: null, av3: null, recS1: null, s1: 0,
          av4: null, av5: null, av6: null, recS2: null, s2: 0,
          extra: null, conselho: null, afc: null, pf: 0,
          concept: 'E', result: 'Pendente' as const
        };
      }
    });

    // Keep old grade records for this student and old class, and add new ones (prevent duplicates)
    setGrades(prev => {
      const targetGradesFiltered = targetGrades.filter(tg => !prev.some(eg => eg.studentId === studentId && eg.classId === targetClassId && eg.subjectId === tg.subjectId));
      return [...prev, ...targetGradesFiltered];
    });

    // Copy direct absences for matching subjects (keeping old ones intact for history)
    setDirectAbsences(prev => {
      const updated = { ...prev };
      newSubjects.forEach(sub => {
        const oldKey = `${studentId}_${sub.id}_${oldClassId}`;
        const newKey = `${studentId}_${sub.id}_${targetClassId}`;
        if (prev[oldKey] !== undefined) {
          updated[newKey] = prev[oldKey];
          // Do NOT delete the oldKey so the old class keeps the attendance history
        }
      });
      return updated;
    });

    // Update user classId
    setUsers(prev => prev.map(u => u.id === studentId ? { ...u, classId: targetClassId } : u));

    // Initialize/sync document list for the new course
    const targetCourse = courses.find(co => co.id === targetClass.courseId);
    const requiredDocs = getRequiredDocsForStudent(targetCourse?.name);
    
    setStudentDocuments(prev => {
      // Retain existing docs for this student but filter out ones not required anymore
      // and add the newly required ones that don't exist.
      const studentDocs = prev.filter(doc => doc.studentId === studentId);
      const otherStudentsDocs = prev.filter(doc => doc.studentId !== studentId);
      
      const updatedStudentDocs: StudentDocument[] = [];
      requiredDocs.forEach(docName => {
        const docId = `doc_${studentId}_${docName}`;
        const existing = studentDocs.find(d => d.name === docName);
        if (existing) {
          updatedStudentDocs.push(existing);
        } else {
          updatedStudentDocs.push({
            id: docId,
            studentId,
            name: docName,
            status: 'PENDENTE'
          });
        }
      });
      return [...otherStudentsDocs, ...updatedStudentDocs];
    });

    // Log security activity
    addSecurityLog('SISTEMA', `Aluno [${student.name}] transferido com sucesso para a turma [${targetClass.name}].`, 'low');
    addNotification(studentId, `Você foi transferido para a turma ${targetClass.name} do curso ${targetCourse?.name || 'Técnico'}.`);
  };

  // Security Audit Logging
  const addSecurityLog = (eventType: string, details: string, severity: 'low' | 'medium' | 'high' = 'low') => {
    const newLog = {
      id: `sec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      eventType,
      ipAddress: '186.230.41.12',
      details,
      severity
    };
    setSecurityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      safeLocalStorage.setItem('oc_security_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Local JSON Backup Download
  const triggerLocalBackup = () => {
    const payload = {
      users,
      courses,
      classes,
      subjects,
      grades,
      attendance,
      conceptRanges,
      calendarEvents,
      messages,
      notifications,
      currentPeriod,
      periods,
      simulatedDate,
      autoLockEnabled,
      declarationConfigs,
      studentDocuments,
      internships,
      adminPasswordResetDone,
      securityLogs
    };
    
    // Integrity checksum calculation (non-tampering verification)
    const payloadStr = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < payloadStr.length; i++) {
      const char = payloadStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const signature = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

    const backupData = {
      app: 'colegio_oc_portal_backup',
      version: '2.4.0-secured',
      timestamp: new Date().toISOString(),
      checksum: signature,
      payload
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `colegio_oc_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addSecurityLog('BACKUP_LOCAL', 'Backup local verificado e criptografado gerado e exportado com sucesso.', 'low');
  };

  // Cloud Backup Trigger (Manual forced backup to Google Cloud Firestore)
  const triggerCloudBackup = async (): Promise<boolean> => {
    setCloudBackupStatus('syncing');
    try {
      const payload: SystemStatePayload = {
        users, courses, classes, subjects, grades, attendance, directAbsences,
        conceptRanges, calendarEvents, messages, notifications,
        currentPeriod, periods, simulatedDate, autoLockEnabled, securityLogs,
        declarationConfigs, studentDocuments, internships, adminPasswordResetDone
      };
      const success = await saveStateToCloud(payload);
      if (success) {
        const now = new Date();
        setLastCloudBackupTime(now.toISOString());
        safeLocalStorage.setItem('oc_last_cloud_backup_time', now.toISOString());
        setCloudBackupStatus('success');
        addSecurityLog('BACKUP_NUVEM', 'Backup redundante sincronizado e salvo com sucesso na nuvem Firestore.', 'low');
        return true;
      } else {
        setCloudBackupStatus('error');
        addSecurityLog('BACKUP_NUVEM_FALHA', 'Falha ao forçar backup síncrono na nuvem Firestore.', 'medium');
        return false;
      }
    } catch (err: any) {
      const isQuota = err?.code === 'resource-exhausted' || 
                      err?.message?.toLowerCase().includes('quota') || 
                      err?.message?.toLowerCase().includes('exhausted') ||
                      err?.message?.toLowerCase().includes('limit exceeded');
      if (isQuota) {
        setCloudBackupStatus('quota_exceeded');
        addSecurityLog('BACKUP_NUVEM_COTA', 'Limite de cota de escrita diária do Firestore atingido durante backup manual.', 'medium');
      } else {
        setCloudBackupStatus('error');
        addSecurityLog('BACKUP_NUVEM_FALHA', `Erro inesperado no backup em nuvem: ${(err as Error).message}`, 'medium');
      }
      return false;
    }
  };

  // Restore payload from backup JSON
  const restoreFromBackup = (jsonString: string): { success: boolean; message: string } => {
    try {
      const sanitizedInput = jsonString.trim();
      if (sanitizedInput.includes('<script')) {
        addSecurityLog('ATAQUE_DETECTADO', 'Injeção perigosa de script HTML interceptada durante a importação.', 'high');
        return { success: false, message: 'Filtro Anti-XSS: Caracteres proibidos detectados no backup. Transação negada!' };
      }

      const parsed = JSON.parse(sanitizedInput);
      if (parsed.app !== 'colegio_oc_portal_backup' || !parsed.payload) {
        addSecurityLog('INTEGRIDADE_FALHA', 'Estrutura de cabeçalho de backup ilegível ou violada.', 'medium');
        return { success: false, message: 'Arquivo inválido. Assinatura de cabeçalho incompatível com o sistema.' };
      }

      // Check integrity signature
      const payloadStr = JSON.stringify(parsed.payload);
      let hash = 0;
      for (let i = 0; i < payloadStr.length; i++) {
        const char = payloadStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const calculatedChecksum = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

      if (parsed.checksum && parsed.checksum !== calculatedChecksum) {
        addSecurityLog('INTEGRIDADE_VIOLADA', 'Falha ao validar hash de integridade de arquivo de importação. Conteúdo alterado!', 'high');
        return { success: false, message: 'Aviso de Segurança: O hash de integridade deste arquivo não confere. O arquivo foi adulterado manualmente e pode comprometer o sistema!' };
      }

      const { payload } = parsed;
      if (payload.users) { setUsers(payload.users); safeLocalStorage.setItem('oc_users', JSON.stringify(payload.users)); }
      if (payload.courses) { setCourses(payload.courses); safeLocalStorage.setItem('oc_courses', JSON.stringify(payload.courses)); }
      if (payload.classes) { setClasses(payload.classes); safeLocalStorage.setItem('oc_classes', JSON.stringify(payload.classes)); }
      if (payload.subjects) { setSubjects(payload.subjects); safeLocalStorage.setItem('oc_subjects', JSON.stringify(payload.subjects)); }
      if (payload.grades) { setGrades(payload.grades); safeLocalStorage.setItem('oc_grades', JSON.stringify(payload.grades)); }
      if (payload.attendance) { setAttendance(payload.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(payload.attendance)); }
      if (payload.conceptRanges) { setConceptRanges(payload.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(payload.conceptRanges)); }
      if (payload.calendarEvents) { setCalendarEvents(payload.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(payload.calendarEvents)); }
      if (payload.messages) { setMessages(payload.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(payload.messages)); }
      if (payload.notifications) { setNotifications(payload.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(payload.notifications)); }
      if (payload.currentPeriod) { setCurrentPeriod(payload.currentPeriod); safeLocalStorage.setItem('oc_current_period', payload.currentPeriod); }
      if (payload.periods) { setPeriods(payload.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(payload.periods)); }
      if (payload.simulatedDate) { setSimulatedDate(payload.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', payload.simulatedDate); }
      if (payload.autoLockEnabled !== undefined) { setAutoLockEnabled(payload.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', payload.autoLockEnabled ? 'true' : 'false'); }
      if (payload.declarationConfigs) { setDeclarationConfigs(payload.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(payload.declarationConfigs)); }
      if (payload.studentDocuments) { setStudentDocuments(payload.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(payload.studentDocuments)); }
      if (payload.internships) { setInternships(payload.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(payload.internships)); }
      if (payload.adminPasswordResetDone !== undefined) { setAdminPasswordResetDone(payload.adminPasswordResetDone); safeLocalStorage.setItem('oc_admin_reset_done', payload.adminPasswordResetDone ? 'true' : 'false'); }
      if (payload.securityLogs) { setSecurityLogs(payload.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(payload.securityLogs)); }

      addSecurityLog('RESTAURACAO_LOCAL', 'Restauração de sistema bem-sucedida via upload de backup encriptado local.', 'high');
      return { success: true, message: 'Dados do sistema restaurados com sucesso!' };

    } catch (err) {
      addSecurityLog('SISTEMA_ERRO', `Restauro local abortado por erro estrutural: ${(err as Error).message}`, 'medium');
      return { success: false, message: 'Erro ao processar arquivo de restauração.' };
    }
  };

  // Restore payload from cloud Firestore database
  const restoreFromCloud = async (): Promise<{ success: boolean; message: string }> => {
    try {
      setCloudBackupStatus('syncing');
      const cloudState = await loadStateFromCloud();
      if (cloudState && 'isOffline' in cloudState) {
        setCloudBackupStatus('offline');
        return { success: false, message: 'O Firestore está temporariamente indisponível (offline ou problema de rede).' };
      }
      if (!cloudState) {
        setCloudBackupStatus('error');
        return { success: false, message: 'Nenhum nó de backup em nuvem foi encontrado no Firestore.' };
      }

      const state = cloudState as SystemStatePayload;

      if (state.users) { setUsers(state.users); safeLocalStorage.setItem('oc_users', JSON.stringify(state.users)); }
      if (state.courses) { setCourses(state.courses); safeLocalStorage.setItem('oc_courses', JSON.stringify(state.courses)); }
      if (state.classes) { setClasses(state.classes); safeLocalStorage.setItem('oc_classes', JSON.stringify(state.classes)); }
      if (state.subjects) { setSubjects(state.subjects); safeLocalStorage.setItem('oc_subjects', JSON.stringify(state.subjects)); }
      if (state.grades) { setGrades(state.grades); safeLocalStorage.setItem('oc_grades', JSON.stringify(state.grades)); }
      if (state.attendance) { setAttendance(state.attendance); safeLocalStorage.setItem('oc_attendance', JSON.stringify(state.attendance)); }
      if (state.directAbsences) { setDirectAbsences(state.directAbsences); safeLocalStorage.setItem('oc_direct_absences', JSON.stringify(state.directAbsences)); }
      if (state.conceptRanges) { setConceptRanges(state.conceptRanges); safeLocalStorage.setItem('oc_concept_ranges', JSON.stringify(state.conceptRanges)); }
      if (state.calendarEvents) { setCalendarEvents(state.calendarEvents); safeLocalStorage.setItem('oc_calendar_events', JSON.stringify(state.calendarEvents)); }
      if (state.messages) { setMessages(state.messages); safeLocalStorage.setItem('oc_messages', JSON.stringify(state.messages)); }
      if (state.notifications) { setNotifications(state.notifications); safeLocalStorage.setItem('oc_notifications', JSON.stringify(state.notifications)); }
      if (state.declarationConfigs) { setDeclarationConfigs(state.declarationConfigs); safeLocalStorage.setItem('oc_declaration_configs', JSON.stringify(state.declarationConfigs)); }
      if (state.studentDocuments) { setStudentDocuments(state.studentDocuments); safeLocalStorage.setItem('oc_student_documents', JSON.stringify(state.studentDocuments)); }
      if (state.internships) { setInternships(state.internships); safeLocalStorage.setItem('oc_internships', JSON.stringify(state.internships)); }
      if (state.currentPeriod) { setCurrentPeriod(state.currentPeriod); safeLocalStorage.setItem('oc_current_period', state.currentPeriod); }
      if (state.periods) { setPeriods(state.periods); safeLocalStorage.setItem('oc_periods', JSON.stringify(state.periods)); }
      if (state.simulatedDate) { setSimulatedDate(state.simulatedDate); safeLocalStorage.setItem('oc_simulated_date', state.simulatedDate); }
      if (state.autoLockEnabled !== undefined) { setAutoLockEnabled(state.autoLockEnabled); safeLocalStorage.setItem('oc_auto_lock_enabled', state.autoLockEnabled ? 'true' : 'false'); }
      if (state.securityLogs) { setSecurityLogs(state.securityLogs); safeLocalStorage.setItem('oc_security_logs', JSON.stringify(state.securityLogs)); }
      if (state.adminPasswordResetDone !== undefined) {
        setAdminPasswordResetDone(state.adminPasswordResetDone);
        safeLocalStorage.setItem('oc_admin_reset_done', state.adminPasswordResetDone ? 'true' : 'false');
      }

      if (state.lastBackupTime) {
        setLastCloudBackupTime(state.lastBackupTime);
        safeLocalStorage.setItem('oc_last_cloud_backup_time', state.lastBackupTime);
      }

      setCloudBackupStatus('success');
      addSecurityLog('RESTAURACAO_NUVEM', 'Portal inteiramente restaurado com sucesso do banco de dados na nuvem Firestore.', 'high');
      return { success: true, message: 'Sistema sincronizado e recuperado com sucesso do banco de dados na nuvem!' };
    } catch (err: any) {
      const isQuota = err?.code === 'resource-exhausted' || 
                      err?.message?.toLowerCase().includes('quota') || 
                      err?.message?.toLowerCase().includes('exhausted') ||
                      err?.message?.toLowerCase().includes('limit exceeded');
      if (isQuota) {
        setCloudBackupStatus('quota_exceeded');
        addSecurityLog('RESTAURACAO_NUVEM_COTA', 'Limite de cota de leitura diária do Firestore atingido durante restauração.', 'medium');
        return { success: false, message: 'Erro: Limite de cota diária do Firestore excedido. Seus dados estão preservados localmente.' };
      }
      setCloudBackupStatus('error');
      return { success: false, message: `Erro crítico ao ler dados da nuvem Firestore: ${(err as Error).message}` };
    }
  };

  const resetFailedAttempts = (username: string) => {
    const cleanUser = username.trim().toLowerCase();
    setFailedAttemptsMap(prev => ({
      ...prev,
      [cleanUser]: { count: 0, lockoutUntil: null }
    }));
    addSecurityLog('SISTEMA_CONF', `Sinal de segurança: Contadores de erros limpos para [${cleanUser}].`, 'low');
  };

  // Helper to calculate the next backup time
  const calculateNextBackupTime = (frequency: 'manual' | 'daily' | 'weekly' | 'monthly', hour: string, fromDateStr: string): string | null => {
    if (frequency === 'manual') return null;
    
    const fromDate = new Date(fromDateStr);
    const [h, m] = hour.split(':').map(Number);
    
    const nextDate = new Date(fromDate);
    nextDate.setHours(h, m, 0, 0);
    
    if (nextDate.getTime() <= fromDate.getTime()) {
      if (frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }
    return nextDate.toISOString();
  };

  const fetchStorageBackups = async () => {
    setIsLoadingStorageBackups(true);
    try {
      const files = await listBackupsFromStorage();
      setStorageBackups(files);
    } catch (err) {
      console.error('Failed to fetch storage backups:', err);
    } finally {
      setIsLoadingStorageBackups(false);
    }
  };

  const triggerStorageBackup = async (): Promise<string | null> => {
    try {
      const currentState = latestStateRef.current;
      const payload: SystemStatePayload = {
        users: currentState.users,
        courses: currentState.courses,
        classes: currentState.classes,
        subjects: currentState.subjects,
        grades: currentState.grades,
        attendance: currentState.attendance,
        directAbsences: currentState.directAbsences,
        conceptRanges: currentState.conceptRanges,
        calendarEvents: currentState.calendarEvents,
        messages: currentState.messages,
        notifications: currentState.notifications,
        currentPeriod: currentState.currentPeriod,
        periods: currentState.periods,
        simulatedDate: currentState.simulatedDate,
        autoLockEnabled: currentState.autoLockEnabled,
        securityLogs: currentState.securityLogs,
        adminPasswordResetDone: currentState.adminPasswordResetDone
      };
      
      // Calculate checksum signature
      const payloadStr = JSON.stringify(payload);
      let hash = 0;
      for (let i = 0; i < payloadStr.length; i++) {
        const char = payloadStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const checksum = `oc-sec-sig-${Math.abs(hash).toString(16)}`;

      const backupData = {
        app: 'colegio_oc_portal_backup',
        version: '2.4.0-secured',
        timestamp: new Date().toISOString(),
        checksum,
        payload
      };

      const filename = `colegio_oc_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const url = await uploadBackupToStorage(backupData as any, filename);
      
      if (url) {
        addSecurityLog('EXPORT_STORAGE', `Backup de segurança exportado e armazenado com sucesso no Firebase Storage: ${filename}`, 'low');
        
        // Update backup schedule state with new times
        const nowStr = new Date().toISOString();
        setBackupSchedule(prev => {
          const next = calculateNextBackupTime(prev.frequency, prev.hour, nowStr);
          const updated = {
            ...prev,
            lastBackupTime: nowStr,
            nextBackupTime: next
          };
          safeLocalStorage.setItem('oc_backup_schedule', JSON.stringify(updated));
          return updated;
        });

        // Refresh list
        await fetchStorageBackups();
        return url;
      }
      return null;
    } catch (err) {
      addSecurityLog('SISTEMA_ERRO', `Falha ao exportar backup para o Firebase Storage: ${(err as Error).message}`, 'medium');
      return null;
    }
  };

  const deleteStorageBackup = async (filename: string): Promise<boolean> => {
    try {
      const success = await deleteBackupFromStorage(filename);
      if (success) {
        addSecurityLog('REMOVER_BACKUP', `Backup excluído do Firebase Storage: ${filename}`, 'medium');
        await fetchStorageBackups();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete storage backup:', err);
      return false;
    }
  };

  const updateBackupSchedule = async (config: Partial<BackupScheduleConfig>) => {
    setBackupSchedule(prev => {
      const updated = {
        ...prev,
        ...config
      };
      if (config.frequency || config.hour !== undefined || config.enabled !== undefined) {
        if (updated.enabled && updated.frequency !== 'manual') {
          updated.nextBackupTime = calculateNextBackupTime(updated.frequency, updated.hour, new Date().toISOString());
        } else {
          updated.nextBackupTime = null;
        }
      }
      safeLocalStorage.setItem('oc_backup_schedule', JSON.stringify(updated));
      return updated;
    });
    addSecurityLog('AGENDAMENTO_BACKUP', `Configurações de agendamento de backup atualizadas: Frequência: ${config.frequency || 'mantida'}`, 'low');
  };

  // Automated background backup checker
  useEffect(() => {
    if (!backupSchedule.enabled || backupSchedule.frequency === 'manual' || !backupSchedule.nextBackupTime) {
      return;
    }
    
    const checkSchedule = () => {
      const now = new Date();
      const nextTime = new Date(backupSchedule.nextBackupTime!);
      
      if (now.getTime() >= nextTime.getTime()) {
        console.log('[Scheduler] Executando backup agendado automaticamente para o Storage...');
        triggerStorageBackup();
      }
    };
    
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [backupSchedule]);

  // Load backups list initially
  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      fetchStorageBackups();
    }
  }, [currentUser]);

  // Automated background backup running with debounced real-time autosave (persists replica in Google Cloud Firestore)
  useEffect(() => {
    if (!hasReceivedInitialCloudSync) return;
    if (isLoading) return; // Prevent overwriting cloud data during initial loading phase
    if (cloudBackupStatus === 'quota_exceeded') return; // Do not attempt saves if quota is exceeded

    const currentPayload = {
      users, courses, classes, subjects, grades, attendance, directAbsences,
      conceptRanges, calendarEvents, messages, notifications,
      currentPeriod, periods, simulatedDate, autoLockEnabled,
      declarationConfigs, studentDocuments, internships,
      adminPasswordResetDone
    };
    const currentPayloadStr = JSON.stringify(currentPayload);

    // Skip saving if local state is identical to what was recently received from/saved to the cloud
    if (currentPayloadStr === lastReceivedPayloadRef.current) {
      setCloudBackupStatus('success');
      editStartTimeRef.current = null;
      return;
    }

    // Track when unsaved edits started
    if (!editStartTimeRef.current) {
      editStartTimeRef.current = Date.now();
    }

    // Update local modification time because a change was detected
    const nowStr = new Date().toISOString();
    setLastLocalWriteTime(nowStr);
    safeLocalStorage.setItem('oc_last_local_write_time', nowStr);

    const elapsedTime = Date.now() - editStartTimeRef.current;
    const debounceDelay = elapsedTime >= 4000 ? 0 : 1000;

    const delayDebounceFn = setTimeout(async () => {
      const payload: SystemStatePayload = {
        ...currentPayload,
        securityLogs
      };
      
      setCloudBackupStatus('syncing');
      try {
        const success = await saveStateToCloud(payload);
        
        if (success) {
          editStartTimeRef.current = null; // Reset unsaved edit timestamp on success
          // Prevent re-triggering due to this exact state
          lastReceivedPayloadRef.current = currentPayloadStr;
          
          const now = new Date();
          setLastCloudBackupTime(now.toISOString());
          safeLocalStorage.setItem('oc_last_cloud_backup_time', now.toISOString());
          setCloudBackupStatus('success');

          // Silently insert an autocheck in logs
          setSecurityLogs(prev => {
            const timestampStr = now.toLocaleTimeString('pt-BR');
            const autoLog = {
              id: `sec_auto_${Date.now()}`,
              timestamp: now.toISOString(),
              eventType: 'BACKUP_AUTO',
              ipAddress: 'Google Cloud Firestore',
              details: `Sincronização automática em nuvem concluída com sucesso às ${timestampStr}.`,
              severity: 'low'
            };
            const updated = [autoLog, ...prev].slice(0, 50);
            safeLocalStorage.setItem('oc_security_logs', JSON.stringify(updated));
            return updated;
          });
        } else {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setCloudBackupStatus('offline');
          } else {
            setCloudBackupStatus('error');
          }
        }
      } catch (err: any) {
        const isQuota = err?.code === 'resource-exhausted' || 
                        err?.message?.toLowerCase().includes('quota') || 
                        err?.message?.toLowerCase().includes('exhausted') ||
                        err?.message?.toLowerCase().includes('limit exceeded');
        if (isQuota) {
          console.error('Cota de escrita do Firestore excedida durante sincronização automática:', err);
          setCloudBackupStatus('quota_exceeded');
          addSecurityLog('SINC_NUVEM_COTA', 'Limite de escrita automática do Firestore esgotado.', 'medium');
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setCloudBackupStatus('offline');
        } else {
          setCloudBackupStatus('error');
        }
      }
    }, debounceDelay); // Use 0ms if unsaved changes have been pending for >=4000ms, else 1000ms

    return () => clearTimeout(delayDebounceFn);
  }, [isLoading, hasReceivedInitialCloudSync, users, courses, classes, subjects, grades, attendance, directAbsences, conceptRanges, calendarEvents, messages, notifications, currentPeriod, periods, simulatedDate, autoLockEnabled, declarationConfigs, studentDocuments, internships, adminPasswordResetDone]);

  // Recovery mechanism for quota_exceeded status (resets status to idle after 5 minutes to retry)
  useEffect(() => {
    if (cloudBackupStatus !== 'quota_exceeded') return;

    const quotaResetTimer = setTimeout(() => {
      console.log('Resetando status de cota excedida para idle para permitir tentativa de autosave.');
      setCloudBackupStatus('idle');
    }, 5 * 60 * 1000);

    return () => clearTimeout(quotaResetTimer);
  }, [cloudBackupStatus]);

  return (
    <AppContext.Provider value={{
      isLoading,
      currentUser, users, courses, classes, subjects, grades, attendance, 
      conceptRanges, calendarEvents, messages, notifications,
      activeClassId, activeSubjectId,
      autoLockEnabled, setAutoLockEnabled,
      simulatedDate, setSimulatedDate,
      updateCalendarEventDate,
      isClassS1Locked, isClassS2Locked, isClassDefinitiveLocked,
      currentPeriod, periods, setCurrentPeriod, addPeriod,
      wipeAllData, loadDemoData,
      login, logout, updatePassword, recoverPassword,
      setActiveClassId, setActiveSubjectId,
      addCourse, addClass, updateClass, deleteClass, addSubject, updateSubject, deleteSubject, addUser, updateUser, deleteUser, unifyDuplicateStudents, unifyDuplicateSubjects, syncSubjectsWithOfficialCurriculum, updateGrade, updateConceptRanges,
      saveAttendanceSession, addAttendanceSession,
      directAbsences, updateStudentAbsences,
      toggleJournalStatus, sendMessage, addNotification, clearNotifications,
      getStudentAbsences, getStudentAttendanceGrid,
      importStudents, importSubjects, importConcepts, importHistoricalData, repairDuplicateImports, undoHistoricalImports,
      securityLogs, cloudBackupStatus, lastCloudBackupTime,
      addSecurityLog, triggerLocalBackup, triggerCloudBackup,
      restoreFromBackup, restoreFromCloud, failedAttemptsMap, resetFailedAttempts,
      backupSchedule, updateBackupSchedule,
      storageBackups, isLoadingStorageBackups, fetchStorageBackups,
      triggerStorageBackup, deleteStorageBackup,
      declarationConfigs, studentDocuments, internships,
      updateDeclarationConfig, updateStudentDocumentStatus, transferStudent, updateInternshipRecord,
      adminPasswordResetDone, resetAdminPassword, unlockAdminReset
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
