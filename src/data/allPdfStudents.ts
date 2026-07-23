import { User, UserRole } from '../types';

export const allPdfStudentUsers: User[] = [
  {
    id: 'std_aluno_teste',
    name: 'Aluno Teste',
    username: '2026001',
    email: 'aluno.teste@lynxedu.com.br',
    role: UserRole.STUDENT,
    enrollment: '2026001',
    classId: 'class_enf_m1_matutino',
    active: true
  }
];
