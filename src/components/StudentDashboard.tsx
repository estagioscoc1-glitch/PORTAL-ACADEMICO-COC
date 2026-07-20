/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp, getRequiredDocsForStudent } from '../context/AppContext';
import { 
  GraduationCap, Printer, Bell, Calendar, HelpCircle, CheckCircle, 
  AlertTriangle, BookOpen, Clock, Sparkles, ExternalLink, FileText, 
  Image as ImageIcon, Mic, Download, X, Paperclip, ShieldCheck, ShieldAlert,
  Upload, UploadCloud, Briefcase, MapPin, Award, History
} from 'lucide-react';
import { PrintModal } from './PrintModal';
import { getInternshipComponentsByCourse } from './AdminInternships';
import { motion } from 'motion/react';

interface StudentDashboardProps {
  studentId?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId }) => {
  const { 
    currentUser, subjects, grades, classes, getStudentAbsences, 
    notifications, calendarEvents, currentPeriod, courses, messages,
    simulatedDate, declarationConfigs, studentDocuments, updateStudentDocumentStatus,
    users, internships
  } = useApp();
  const [printDoc, setPrintDoc] = useState<boolean>(false);
  const [printHistorico, setPrintHistorico] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'aproveitamento' | 'declaracoes' | 'documentos' | 'estagio' | 'historico_completo'>('aproveitamento');
  const [printDeclType, setPrintDeclType] = useState<'decl_escolaridade' | 'decl_ctransp' | 'decl_vacina' | null>(null);
  
  // Local state for simulated uploads
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);
  const [simulatedFile, setSimulatedFile] = useState<{ name: string; size: string } | null>(null);

  const activeStudent = studentId ? (users.find(u => u.id === studentId) || currentUser) : currentUser;

  if (!activeStudent) return null;

  // Parse active period
  const [yearStr, semStr] = currentPeriod.split('/');
  const currentYear = parseInt(yearStr) || 2026;
  const currentSemester = parseInt(semStr) || 1;

  // Active period classes
  const activePeriodClasses = classes.filter(c => c.year === currentYear && c.semester === currentSemester);
  const activePeriodClassIds = activePeriodClasses.map(c => c.id);

  // Student's grade records in the active period
  const studentGrades = grades.filter(g => g.studentId === activeStudent.id && activePeriodClassIds.includes(g.classId));

  // Determine the active class for the student
  const studentClassId = studentGrades[0]?.classId;
  const targetClass = classes.find(c => c.id === studentClassId) || activePeriodClasses[0];

  // Course info
  const courseInfo = targetClass ? courses.find(co => co.id === targetClass.courseId) : null;

  // Enrolled subjects
  const studentSubjects = targetClass 
    ? subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module)
    : [];

  // Filter student notifications and messages
  const studentNotifications = notifications.filter(n => n.userId === activeStudent.id);
  const studentMessages = messages.filter(m => m.recipientId === activeStudent.id);

  return (
    <div id="student-dashboard-container" className="space-y-6">
      
      {/* High-visibility Notice Banner */}
      {studentNotifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/70 dark:border-amber-500/40 p-4 rounded-2xl shadow-md flex items-start gap-4 select-none relative overflow-hidden animate-pulse-slow"
        >
          {/* Ambient background glow */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-lg shadow-amber-500/20 mt-0.5">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">
                AVISO ACADÊMICO RECENTE
              </span>
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-400 font-extrabold rounded uppercase tracking-wider">
                Novo
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold ml-auto">
                Dia {studentNotifications[0].date.substring(5, 10).replace('-', '/')} às {studentNotifications[0].date.substring(11, 16)}h
              </span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-amber-100 leading-relaxed">
              {studentNotifications[0].content}
            </p>
          </div>
        </motion.div>
      )}

      {/* Student Welcome Header Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden select-none">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <GraduationCap className="h-8 w-8 text-blue-200" />
            </div>
            <div>
              <span className="bg-white/15 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-blue-200">Aluno Regular</span>
              <h2 className="text-xl sm:text-2xl font-black mt-1 text-white">{activeStudent.name}</h2>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Matrícula: <strong className="font-mono">{activeStudent.enrollment}</strong> • Curso: {courseInfo?.name || 'Curso Técnico'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://col-gio-oswaldo-cruz-carreira-ia-199284089949.us-east1.run.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-350 hover:to-teal-350 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-400/30 hover:shadow-emerald-400/50 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wide border-2 border-emerald-300"
            >
              <Sparkles className="h-4 w-4 text-slate-950 animate-pulse" />
              <span>OC Carreira IA</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-950" />
            </a>

            <a
              href="https://colegiooswaldocruz-acw.alunoead.com.br/login/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-450 hover:to-blue-450 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wide border-2 border-indigo-400"
            >
              <ExternalLink className="h-4 w-4 text-white" />
              <span>Acesso Plataforma EAD</span>
            </a>

            <button
              type="button"
              id="print-individual-bulletin-btn"
              onClick={() => setPrintDoc(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-blue-800 font-extrabold rounded-xl text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Exportar Ficha de Aproveitamento
            </button>

            <button
              type="button"
              id="student-view-internships-btn"
              onClick={() => setActiveSubTab('estagio')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer select-none border shadow-md active:scale-95 ${
                activeSubTab === 'estagio'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 font-black'
                  : 'bg-white hover:bg-slate-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Briefcase className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Acompanhar Estágios</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Left: Ficha de Aproveitamento Individual Table (High Fidelity) */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
          
          {/* Sub-Tabs Nav - 2-row layout (3 on top, 2 below) for easier mobile/desktop navigation without scrolling */}
          <div className="flex flex-col gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
            {/* Top Row: 3 buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveSubTab('aproveitamento')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'aproveitamento'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📊 Aproveitamento
              </button>
              <button
                onClick={() => setActiveSubTab('historico_completo')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'historico_completo'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📜 Histórico Completo
              </button>
              <button
                onClick={() => setActiveSubTab('declaracoes')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'declaracoes'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📄 Minhas Declarações
              </button>
            </div>
            {/* Bottom Row: 2 buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveSubTab('documentos')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'documentos'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                📁 Envio de Documentos
              </button>
              <button
                onClick={() => setActiveSubTab('estagio')}
                className={`px-2 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center truncate ${
                  activeSubTab === 'estagio'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                💼 Estágios Curriculares
              </button>
            </div>
          </div>

          {/* TAB 1: APROVEITAMENTO */}
          {activeSubTab === 'aproveitamento' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Ficha de Aproveitamento Individual</h3>
                  <p className="text-xs text-slate-400">Notas, conceitos e faltas consolidados em tempo real no módulo atual.</p>
                </div>
                <div className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wide hidden sm:block">
                  MÓDULO {targetClass?.module || 1} • TURNO {targetClass?.shift || 'MATUTINO'} • PERÍODO {currentPeriod}
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="min-w-[750px] w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[9px] tracking-wider select-none h-10">
                      <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-150 dark:border-slate-800 z-10 w-[180px] min-w-[180px] max-w-[180px]">Disciplinas</th>
                      <th className="py-2.5 px-2 text-center">S1</th>
                      <th className="py-2.5 px-2 text-center">S2</th>
                      <th className="py-2.5 px-2 text-center">AFC</th>
                      <th className="py-2.5 px-2 text-center">EX</th>
                      <th className="py-2.5 px-2 text-center">CS</th>
                      <th className="py-2.5 px-2 text-center font-bold text-blue-700 dark:text-blue-300">PF</th>
                      <th className="py-2.5 px-2 text-center">Faltas</th>
                      <th className="py-2.5 px-2 text-center">Conceito</th>
                      <th className="py-2.5 px-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                    {studentSubjects.map(sub => {
                      const score = studentGrades.find(g => g.subjectId === sub.id);
                      const absences = getStudentAbsences(activeStudent.id, sub.id);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 border-r border-slate-150 dark:border-slate-800 z-10 w-[180px] min-w-[180px] max-w-[180px] truncate">{sub.name}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score ? score.s1.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score ? score.s2.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.afc ? score.afc.toFixed(1) : '0.0'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.extra ? score.extra : '-'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{score?.conselho ? score.conselho : '-'}</td>
                          <td className="py-2.5 px-2 text-center font-black text-blue-700 dark:text-blue-300 font-mono bg-blue-50/10 dark:bg-blue-950/5">
                            {score ? score.pf.toFixed(1) : '0.0'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 dark:text-slate-400">
                            {absences.total}
                          </td>
                          <td className="py-2.5 px-2 text-center font-black">{score ? score.concept : 'D'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                              score?.result === 'APTO' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                : score?.result === 'F. NOTA'
                                  ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            }`}>
                              {score ? score.result : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explanatory footer matches original PDF legend styling */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl text-[10px] text-slate-400 leading-relaxed font-semibold font-sans">
                <span className="text-slate-600 dark:text-slate-300 font-bold uppercase mr-1">Legenda:</span>
                S1 Somatório de Notas 1, S2 Somatório de Notas 2, PF Pontuação final, AFC Avaliação Final de Competência, EX Nota Extra, CS Conselho. Média para aprovação: 60,00 pontos e frequência mínima de 75%.
              </div>
            </div>
          )}

          {/* TAB 2: DECLARACOES */}
          {activeSubTab === 'declaracoes' && (() => {
            const isDateWithinRange = (dateStr: string, startStr: string, endStr: string) => {
              if (!startStr || !endStr) return false;
              const current = new Date(dateStr);
              const start = new Date(startStr);
              const end = new Date(endStr);
              current.setHours(0,0,0,0);
              start.setHours(0,0,0,0);
              end.setHours(0,0,0,0);
              return current >= start && current <= end;
            };

            const isEscolaridadeActive = isDateWithinRange(
              simulatedDate, 
              declarationConfigs?.escolaridade?.startDate || '', 
              declarationConfigs?.escolaridade?.endDate || ''
            );

            const isCtranspActive = true; // Unlocked/released without date restrictions as requested

            const formatDateBr = (dateStr: string) => {
              if (!dateStr) return '';
              const [year, month, day] = dateStr.split('-');
              return `${day}/${month}/${year}`;
            };

            return (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Minhas Declarações</h3>
                  <p className="text-xs text-slate-400">Emita declarações institucionais oficiais com validação digital para impressão ou download.</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  
                  {/* CARD 1: ESCOLARIDADE */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Escolaridade</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Atesta que o discente possui matrícula ativa e frequência regular no curso técnico para o período atual.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      {declarationConfigs?.escolaridade?.startDate && (
                        <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                          <span>{formatDateBr(declarationConfigs.escolaridade.startDate)} até {formatDateBr(declarationConfigs.escolaridade.endDate)}</span>
                        </div>
                      )}

                      {isEscolaridadeActive ? (
                        <button
                          onClick={() => setPrintDeclType('decl_escolaridade')}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Gerar PDF
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            disabled
                            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/60 text-slate-400 font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all cursor-not-allowed border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-center gap-1.5"
                          >
                            Bloqueado
                          </button>
                          <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 leading-normal">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Disponível apenas entre {formatDateBr(declarationConfigs?.escolaridade?.startDate || '')} e {formatDateBr(declarationConfigs?.escolaridade?.endDate || '')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: SETRANSP PASSE */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">SETRANSP Passe</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Declaração oficial destinada ao SETRANSP para cadastramento e concessão de passe estudantil meia-tarifa.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      {declarationConfigs?.ctransp?.startDate && (
                        <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                          <span>{formatDateBr(declarationConfigs.ctransp.startDate)} até {formatDateBr(declarationConfigs.ctransp.endDate)}</span>
                        </div>
                      )}

                      {isCtranspActive ? (
                        <button
                          onClick={() => setPrintDeclType('decl_ctransp')}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Gerar PDF
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            disabled
                            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/60 text-slate-400 font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all cursor-not-allowed border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-center gap-1.5"
                          >
                            Bloqueado
                          </button>
                          <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 leading-normal">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Disponível apenas entre {formatDateBr(declarationConfigs?.ctransp?.startDate || '')} e {formatDateBr(declarationConfigs?.ctransp?.endDate || '')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 3: VACINA EM DIA */}
                  <div className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Vacina em Dia</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Atestado institucional comprovando a regularidade vacinal do discente para liberação de laboratórios de saúde.
                      </p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="text-[10px] text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-semibold space-y-0.5">
                        <span className="block font-bold text-[9px] uppercase tracking-wider text-slate-500">Período de Emissão:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Sempre Disponível</span>
                      </div>

                      <button
                        onClick={() => setPrintDeclType('decl_vacina')}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] tracking-wider uppercase transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" /> Gerar PDF
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* TAB 3: DOCUMENTOS */}
          {activeSubTab === 'documentos' && (() => {
            const requiredDocs = getRequiredDocsForStudent(courseInfo?.name);
            const docs = studentDocuments.filter(d => d.studentId === activeStudent.id);

            return (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Meus Documentos Obrigatórios</h3>
                  <p className="text-xs text-slate-400">Verifique a situação e envie seus documentos obrigatórios exigidos pela coordenação.</p>
                </div>

                <div className="space-y-3">
                  {requiredDocs.map(docName => {
                    const docId = `doc_${activeStudent.id}_${docName}`;
                    const docRecord = docs.find(d => d.name === docName);
                    const status = docRecord?.status || 'PENDENTE';

                    return (
                      <div key={docName} className="p-4 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">{docName}</p>
                          {docRecord?.fileName ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Paperclip className="h-3 w-3 shrink-0 text-blue-600" />
                              <a
                                href={docRecord.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline text-blue-600 truncate max-w-[200px]"
                              >
                                {docRecord.fileName}
                              </a>
                              <span>({new Date(docRecord.uploadedAt || '').toLocaleDateString('pt-BR')})</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Documento pendente de entrega digital.</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide ${
                            status === 'ENTREGUE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50'
                              : status === 'ENVIADO'
                              ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50'
                              : 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200/50'
                          }`}>
                            {status === 'ENTREGUE' ? '✅ HOMOLOGADO' : status === 'ENVIADO' ? '🟡 AGUARDANDO ANÁLISE' : '❌ PENDENTE'}
                          </span>

                          {status === 'PENDENTE' && (
                            <button
                              onClick={() => setUploadingDocName(docName)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-all active:scale-95 shadow-md shadow-blue-500/10"
                            >
                              Enviar Documento
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: ESTÁGIO (Student Tracking Portal) */}
          {activeSubTab === 'estagio' && (() => {
            const courseId = courseInfo?.id || '';
            const courseName = courseInfo?.name || '';
            const components = getInternshipComponentsByCourse(courseId, courseName);
            const studentInternships = internships.filter(r => r.studentId === activeStudent.id);

            // Calculations
            const totalRequiredHrs = components.reduce((sum, c) => sum + c.workload, 0);
            
            // Completed is where grade is launched (grade is not null)
            const completedComponents = components.filter(c => {
              const record = studentInternships.find(r => r.subjectName === c.name);
              return record && record.grade !== null;
            });
            const completedHrs = completedComponents.reduce((sum, c) => sum + c.workload, 0);
            const completionPercent = totalRequiredHrs > 0 ? Math.round((completedHrs / totalRequiredHrs) * 100) : 0;

            // Average grade of completed components
            const gradedRecords = studentInternships.filter(r => r.grade !== null);
            const averageGrade = gradedRecords.length > 0 
              ? (gradedRecords.reduce((sum, r) => sum + (r.grade || 0), 0) / gradedRecords.length).toFixed(2)
              : null;

            return (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Controle de Estágios Supervisionados</h3>
                  <p className="text-xs text-slate-400">Acompanhe seu progresso, locais de alocação e notas finais de estágio homologadas pela secretaria.</p>
                </div>

                {components.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    Seu curso atual não possui uma grade de estágios supervisionados curricular associada.
                  </div>
                ) : (
                  <>
                    {/* Visual Progress Dashboard Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Workload Progress Card */}
                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Progresso de Carga Horária</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {completedHrs}h <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {totalRequiredHrs}h</span>
                          </strong>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase">
                          {completionPercent}% Concluído
                        </span>
                      </div>

                      {/* Completed Components Card */}
                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Componentes Concluídos</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {completedComponents.length} <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {components.length}</span>
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Componentes homologados</span>
                        </div>
                      </div>

                      {/* Internship GPA Card */}
                      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Média Geral do Estágio</span>
                          <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                            {averageGrade ? averageGrade : 'N/A'}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Aproveitamento homologado</span>
                        </div>
                      </div>

                    </div>

                    {/* Breakdown list */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-slate-700 dark:text-white text-xs uppercase tracking-wide">
                        Detalhamento por Componente
                      </h4>

                      <div className="space-y-3">
                        {components.map(comp => {
                          const record = studentInternships.find(r => r.subjectName === comp.name);
                          const isCompleted = record && record.grade !== null;

                          return (
                            <div 
                              key={comp.name} 
                              className="p-4 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                    {comp.name}
                                  </p>
                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 rounded uppercase">
                                    {comp.workload}h
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className={record?.location ? 'text-slate-600 dark:text-slate-350 font-medium' : 'italic text-amber-500'}>
                                    {record?.location ? `Realizado em: ${record.location}` : 'Pendente de lançamento'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                                {/* Completion Status Badge */}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30'
                                    : 'bg-amber-100/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/30'
                                }`}>
                                  {isCompleted ? '✓ CONCLUÍDO' : '🟡 PENDENTE'}
                                </span>

                                {/* Grade display */}
                                <div className="text-right shrink-0 min-w-[50px]">
                                  {isCompleted ? (
                                    <span className={`px-2 py-0.5 text-xs font-black rounded ${
                                      (record?.grade || 0) >= 7
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    }`}>
                                      Nota: {record?.grade?.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold italic">
                                      Nota Pendente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB: HISTÓRICO COMPLETO */}
          {activeSubTab === 'historico_completo' && (() => {
            const studentGrades = grades.filter(g => g.studentId === activeStudent.id);
            const uniqueClassIds = Array.from(new Set(studentGrades.map(g => g.classId)));
            const studentClasses = classes.filter(c => uniqueClassIds.includes(c.id));

            studentClasses.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              if (a.semester !== b.semester) return a.semester - b.semester;
              return a.module - b.module;
            });

            return (
              <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Histórico Escolar Completo</h3>
                    <p className="text-xs text-slate-400">Consulte todo o seu aproveitamento acadêmico ao longo do curso.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintHistorico(true)}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all cursor-pointer select-none uppercase tracking-wide shrink-0 self-start sm:self-center"
                  >
                    <Printer className="h-4 w-4" /> Gerar Histórico Completo (PDF)
                  </button>
                </div>

                {studentClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1">Nenhum Registro Encontrado</h4>
                    <p className="text-xs text-slate-400 max-w-sm">Você ainda não possui registros de notas e frequências lançados no sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {studentClasses.map(cls => {
                      const classGrades = studentGrades.filter(g => g.classId === cls.id);
                      const clsSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);

                      return (
                        <div key={cls.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                          {/* Group Header */}
                          <div className="bg-slate-50 dark:bg-slate-850/70 p-4 border-b border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                              Turma: {cls.name} ({cls.code || 'N/A'})
                            </span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                              <span>Ano: {cls.year}</span>
                              <span>Semestre: {cls.semester}º</span>
                              <span>Módulo: {cls.module}º</span>
                            </div>
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-850/35 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <th className="py-3 px-4">Disciplina</th>
                                  <th className="py-3 px-2 text-center w-12">S1</th>
                                  <th className="py-3 px-2 text-center w-12">S2</th>
                                  <th className="py-3 px-2 text-center w-12">AFC</th>
                                  <th className="py-3 px-2 text-center w-12">EX</th>
                                  <th className="py-3 px-2 text-center w-12">CS</th>
                                  <th className="py-3 px-2 text-center w-14 font-black">PF</th>
                                  <th className="py-3 px-3 text-center w-16">Faltas</th>
                                  <th className="py-3 px-3 text-center w-20">Conceito</th>
                                  <th className="py-3 px-4 text-right w-24">Resultado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                {clsSubjects.map(sub => {
                                  const score = classGrades.find(g => g.subjectId === sub.id);
                                  const absences = getStudentAbsences(activeStudent.id, sub.id, cls.id);
                                  return (
                                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                        {sub.name}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score ? score.s1.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score ? score.s2.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.afc ? score.afc.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-black font-mono bg-blue-50/20 text-blue-700 dark:text-blue-400">
                                        {score ? score.pf.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-3 text-center font-mono font-bold text-red-600">
                                        {absences.total}
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          score?.concept === 'A' 
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                            : score?.concept === 'B' 
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                                            : score?.concept === 'C' 
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                            : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                        }`}>
                                          {score ? score.concept : 'D'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                          score?.result === 'APTO' 
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        }`}>
                                          {score ? score.result : 'Pendente'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </div>

        {/* Right: Notifications & Deadlines Column */}
        <div className="md:col-span-4 space-y-4">
          
          {/* OC Carreira IA - Premium Highlighted Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 border-2 border-emerald-400/40 p-5 shadow-lg select-none group hover:border-emerald-400 transition-all duration-300"
          >
            {/* Ambient glows */}
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all duration-500"></div>
            <div className="absolute -left-6 -top-6 w-20 h-20 bg-blue-500/15 rounded-full blur-xl"></div>

            <div className="relative z-10 space-y-4">
              {/* Brand Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* High-fidelity Brand Logo mimicking the user's attachment */}
                  <div className="h-8 w-8 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-400/20 shrink-0 font-extrabold text-slate-950 text-xs tracking-tighter select-none">
                    oc
                  </div>
                  <div className="font-black text-base tracking-tight leading-none text-white select-none">
                    Carreira <span className="text-emerald-400">IA</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 rounded-full uppercase tracking-wider animate-pulse">
                  <Sparkles className="h-3 w-3 text-emerald-400" /> Ativo
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                Descubra o seu futuro profissional! Faça testes vocacionais e explore oportunidades de carreira personalizadas com nossa inteligência artificial oficial.
              </p>

              {/* Call to Action Button */}
              <a
                href="https://col-gio-oswaldo-cruz-carreira-ia-199284089949.us-east1.run.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-350 active:scale-[0.98] text-slate-950 font-black rounded-2xl text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-400/20 hover:shadow-emerald-400/30 transition-all duration-200 cursor-pointer text-center"
              >
                <span>Acessar OC Carreira IA</span>
                <ExternalLink className="h-4 w-4 text-slate-950 shrink-0" />
              </a>
            </div>
          </motion.div>
          
          {/* Notifications Inbox (Avisos e Notificações) */}
          <div className="bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-950/10 dark:to-slate-900 border-2 border-blue-200/80 dark:border-blue-900/50 p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden animate-fade-in">
            {/* Pulsing visual glow effect in the corner */}
            <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Bell className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>
                <h4 className="font-black text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider">Avisos e Notificações</h4>
              </div>
              <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-black animate-pulse">
                {studentNotifications.length} {studentNotifications.length === 1 ? 'Aviso' : 'Avisos'}
              </span>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {studentNotifications.length > 0 ? (
                studentNotifications.map((not, idx) => (
                  <div 
                    key={not.id} 
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                      idx === 0 
                        ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/50 shadow-sm' 
                        : 'bg-white dark:bg-slate-850/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <CheckCircle className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${
                      idx === 0 ? 'text-amber-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <div className="space-y-1">
                      <p className={`leading-relaxed text-[11px] ${
                        idx === 0 ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}>{not.content}</p>
                      <span className="text-[9px] text-slate-400 mt-1 block flex items-center gap-1 font-semibold">
                        <Clock className="h-3 w-3 text-slate-400" /> {not.date.substring(11, 16)}h do dia {not.date.substring(5, 10).replace('-', '/')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum aviso ou nota nova lançada recentemente.</p>
              )}
            </div>
          </div>

          {/* Direct Messages from Pedagogical Coordination */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" />
                <h4 className="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider">Comunicados da Coordenação</h4>
              </div>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-black">
                {studentMessages.length} {studentMessages.length === 1 ? 'Mensagem' : 'Mensagens'}
              </span>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {studentMessages.length > 0 ? (
                studentMessages.map((msg, idx) => (
                  <div key={msg.id} className="p-3 bg-slate-50/50 dark:bg-slate-850/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between font-extrabold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1 text-[11px]">
                        {idx === 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-850 px-1.5 py-0.5 rounded-md font-mono font-semibold">
                        {new Date(msg.date).toLocaleDateString('pt-BR')} {new Date(msg.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {msg.content && (
                      <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {msg.attachmentUrl && (
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="p-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md shrink-0">
                            {msg.attachmentType === 'pdf' ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : msg.attachmentType === 'image' ? (
                              <ImageIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Mic className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px] sm:max-w-[180px]">
                            {msg.attachmentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto">
                          {msg.attachmentType === 'audio' && (
                            <audio src={msg.attachmentUrl} controls className="h-6 w-[130px] sm:w-[150px]" />
                          )}
                          {msg.attachmentType === 'image' && (
                            <img src={msg.attachmentUrl} alt="Preview" referrerPolicy="no-referrer" className="h-6 w-6 rounded object-cover border border-slate-200" />
                          )}
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName || 'arquivo'}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-md flex items-center gap-0.5 cursor-pointer transition-all select-none"
                          >
                            <Download className="h-2.5 w-2.5" /> Baixar
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center italic">Nenhum comunicado individual da coordenação recebido.</p>
              )}
            </div>
          </div>

          {/* Calendar Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Calendar className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <h4 className="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider">Calendário Acadêmico</h4>
            </div>

            <div className="space-y-2">
              {calendarEvents.map(evt => {
                const month = evt.date.substring(5, 7);
                const months: Record<string, string> = {
                  '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
                  '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
                  '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
                };
                const monthAbbr = months[month] || 'JUN';
                const isConselho = evt.type === 'INFO' && evt.title.includes('Conselho');
                const title = isConselho ? `Conselho de Classe de ${currentPeriod}` : evt.title;
                return (
                  <div key={evt.id} className="flex gap-3 items-start py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-lg text-center leading-none min-w-[36px]">
                      <span className="block text-[8px] font-bold uppercase">{monthAbbr}</span>
                      <span className="block text-sm font-black mt-0.5">{evt.date.substring(8, 10)}</span>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{title}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{evt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Printing Modal */}
      {printDoc && (
        <PrintModal
          documentType="boletim"
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={studentSubjects[0]?.id || ''}
          onClose={() => setPrintDoc(false)}
        />
      )}

      {/* Printing Modal for Declarations */}
      {printDeclType && (
        <PrintModal
          documentType={printDeclType}
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={studentSubjects[0]?.id || ''}
          onClose={() => setPrintDeclType(null)}
        />
      )}

      {/* Printing Modal for Complete Academic History */}
      {printHistorico && (
        <PrintModal
          documentType="historico_completo"
          studentId={activeStudent.id}
          classId={targetClass?.id || 'class_enf_m1_matutino'}
          subjectId={''}
          onClose={() => setPrintHistorico(false)}
        />
      )}

      {/* MODAL DE SIMULAÇÃO DE UPLOAD */}
      {uploadingDocName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-150 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">Enviar Documento</h4>
                <p className="text-[10px] text-slate-400">Entrega digital de {uploadingDocName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadingDocName(null);
                  setSimulatedFile(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Selecione o arquivo correspondente ao documento para submissão e análise da secretaria acadêmica.
              </p>

              {/* Input File Box */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl p-6 text-center transition-all relative">
                <input
                  type="file"
                  id="simulated-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSimulatedFile({
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                      });
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2 pointer-events-none">
                  <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {simulatedFile ? (
                      <span className="text-blue-600 dark:text-blue-400">{simulatedFile.name}</span>
                    ) : (
                      <span>Clique para selecionar ou arraste o arquivo</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {simulatedFile ? `Tamanho: ${simulatedFile.size}` : 'Suporta arquivos PDF, PNG ou JPG de até 10MB'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-[10px] text-blue-700 dark:text-blue-400 leading-normal">
                <strong>Simulação Acadêmica:</strong> O upload real para o Firebase Storage foi substituído por uma simulação de conformidade para evitar custos e limites de infraestrutura.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setUploadingDocName(null);
                  setSimulatedFile(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!simulatedFile}
                onClick={() => {
                  if (simulatedFile) {
                    const docId = `doc_${activeStudent.id}_${uploadingDocName}`;
                    updateStudentDocumentStatus(
                      docId,
                      'ENVIADO',
                      'https://firebasestorage.googleapis.com/v0/b/thematic-fragment-xnn32.firebasestorage.app/o/simulated%2Fdocument.pdf?alt=media',
                      simulatedFile.name
                    );
                    setUploadingDocName(null);
                    setSimulatedFile(null);
                  }
                }}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow transition-all uppercase tracking-wider ${
                  simulatedFile
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/15 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                Confirmar Envio
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
