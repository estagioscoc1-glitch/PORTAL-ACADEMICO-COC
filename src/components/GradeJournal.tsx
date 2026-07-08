/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, AlertCircle, Printer, Lock, Unlock, HelpCircle, ArrowRight } from 'lucide-react';
import { PrintModal } from './PrintModal';
import { motion } from 'motion/react';

export const GradeJournal: React.FC = () => {
  const { 
    grades, updateGrade, users, classes, subjects, 
    activeClassId, activeSubjectId, currentUser, toggleJournalStatus,
    getStudentAbsences, isClassS1Locked, isClassS2Locked, isClassDefinitiveLocked,
    autoLockEnabled, simulatedDate, calendarEvents
  } = useApp();

  const [printDoc, setPrintDoc] = useState<any | null>(null);
  const [editingCell, setEditingCell] = useState<{ gradeId: string, field: string } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');

  const targetClass = classes.find(c => c.id === activeClassId);
  const targetSubject = subjects.find(s => s.id === activeSubjectId);

  const handleSaveGrades = () => {
    if (isLocked) return;
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }, 800);
  };
  
  if (!targetClass || !targetSubject) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800">
        <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h4 className="font-bold text-slate-700 dark:text-slate-300">Nenhum Diário Ativo</h4>
        <p className="text-xs text-slate-400 mt-1">Selecione uma turma e disciplina para abrir o diário de notas.</p>
      </div>
    );
  }

  // Check if journal editing is locked
  const isLocked = isClassDefinitiveLocked(targetClass) && currentUser?.role !== 'ADMIN';
  const isS1Locked = isClassS1Locked(targetClass) && currentUser?.role !== 'ADMIN';
  const isS2Locked = isClassS2Locked(targetClass) && currentUser?.role !== 'ADMIN';

  const isAutoLockedDefinitive = autoLockEnabled && calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date && simulatedDate >= (calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date || '') && currentUser?.role !== 'ADMIN';
  const isAutoLockedS1 = autoLockEnabled && calendarEvents.find(e => e.type === 'CLOSING_S1')?.date && simulatedDate >= (calendarEvents.find(e => e.type === 'CLOSING_S1')?.date || '') && currentUser?.role !== 'ADMIN';
  const isAutoLockedS2 = autoLockEnabled && calendarEvents.find(e => e.type === 'CLOSING_S2')?.date && simulatedDate >= (calendarEvents.find(e => e.type === 'CLOSING_S2')?.date || '') && currentUser?.role !== 'ADMIN';

  const classStudents = users.filter(
    u => u.role === 'STUDENT' && (u.classId === targetClass.id || grades.some(g => g.studentId === u.id && g.classId === targetClass.id))
  );
  const journalGrades = grades.filter(g => g.classId === targetClass.id && g.subjectId === targetSubject.id);

  // Helper to split PF/s1/s2 into sub grades for rendering mock av1-6
  const getS1Evaluations = (g: any) => {
    const hasAnyS1 = g.av1 !== null || g.av2 !== null || g.av3 !== null || g.recS1 !== null;
    if (hasAnyS1) {
      return {
        av1: g.av1 !== null ? g.av1 : 0,
        av2: g.av2 !== null ? g.av2 : 0,
        av3: g.av3 !== null ? g.av3 : 0
      };
    }
    const parts = [Math.floor(g.s1 / 3), Math.floor(g.s1 / 3), g.s1 - 2 * Math.floor(g.s1 / 3)];
    return { av1: g.av1 ?? parts[0], av2: g.av2 ?? parts[1], av3: g.av3 ?? parts[2] };
  };

  const getS2Evaluations = (g: any) => {
    const hasAnyS2 = g.av4 !== null || g.av5 !== null || g.av6 !== null || g.recS2 !== null;
    if (hasAnyS2) {
      return {
        av4: g.av4 !== null ? g.av4 : 0,
        av5: g.av5 !== null ? g.av5 : 0,
        av6: g.av6 !== null ? g.av6 : 0
      };
    }
    const parts = [Math.floor(g.s2 / 3), Math.floor(g.s2 / 3), g.s2 - 2 * Math.floor(g.s2 / 3)];
    return { av4: g.av4 ?? parts[0], av5: g.av5 ?? parts[1], av6: g.av6 ?? parts[2] };
  };

  const handleValueChange = (gradeId: string, field: string, val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    
    if (cleanDigits === '') {
      updateGrade(gradeId, { [field]: null });
      setSaveStatus('unsaved');
      return;
    }

    const maxLimit = field === 'afc' ? 40 : 100;
    const num = Math.min(Math.max(parseInt(cleanDigits, 10) || 0, 0), maxLimit);
    updateGrade(gradeId, { [field]: num });
    setSaveStatus('unsaved');
  };

  return (
    <div id="grade-journal-wrapper" className="space-y-4">
      {/* Journal Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-800 dark:text-white tracking-tight text-sm sm:text-base uppercase">
              {targetSubject.name}
            </h3>
            {isLocked ? (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded text-[10px] font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" /> FECHADO
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold flex items-center gap-1">
                <Unlock className="h-3 w-3" /> LIBERADO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Módulo {targetClass.module} • Turno: {targetClass.shift} • Carga Horária: {targetSubject.workload} • {journalGrades.length} Alunos Distribuídos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Journal Lock Toggles */}
          {currentUser?.role === 'ADMIN' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl text-[11px] font-bold">
              <span className="text-slate-500 px-1">Fechar:</span>
              <button
                type="button"
                id="toggle-lock-s1-btn"
                onClick={() => toggleJournalStatus(targetClass.id, 'S1')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  targetClass.closedS1 
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/30' 
                    : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                S1 {targetClass.closedS1 ? '🔒' : '🔓'}
              </button>
              <button
                type="button"
                id="toggle-lock-s2-btn"
                onClick={() => toggleJournalStatus(targetClass.id, 'S2')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  targetClass.closedS2 
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/30' 
                    : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                S2 {targetClass.closedS2 ? '🔒' : '🔓'}
              </button>
              <button
                type="button"
                id="toggle-lock-def-btn"
                onClick={() => toggleJournalStatus(targetClass.id, 'Definitive')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  targetClass.closedDefinitive 
                    ? 'bg-red-600 text-white shadow' 
                    : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                Geral {targetClass.closedDefinitive ? '🔒' : '🔓'}
              </button>
            </div>
          )}

          {/* SAVE BUTTON */}
          <button
            type="button"
            id="save-grades-btn"
            onClick={handleSaveGrades}
            disabled={isLocked || saveStatus === 'saving'}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl text-xs transition-all shadow-sm ${
              saveStatus === 'unsaved'
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : saveStatus === 'saving'
                  ? 'bg-slate-400 text-white cursor-wait'
                  : saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Save className="h-4 w-4" /> Salvo!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar Notas
              </>
            )}
          </button>

          <button
            type="button"
            id="print-journal-btn"
            onClick={() => setPrintDoc({ type: 'diario_notas' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" /> Impressão Oficial
          </button>
          
          <button
            type="button"
            id="print-journal-freq-btn"
            onClick={() => setPrintDoc({ type: 'diario_freq' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
            title="Imprimir Diário de Frequência / Chamadas"
          >
            <Printer className="h-4 w-4" /> Imprimir Frequência
          </button>
        </div>
      </div>

      {/* Save status alerts */}
      {saveStatus === 'unsaved' && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/35 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            <span className="font-extrabold">Você possui alterações não salvas no Diário de Notas!</span>
          </div>
          <button
            type="button"
            onClick={handleSaveGrades}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-xs"
          >
            Salvar Agora
          </button>
        </div>
      )}
      {saveStatus === 'saved' && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/35 rounded-2xl text-xs flex items-center gap-2 shadow-xs animate-fade-in">
          <span className="font-extrabold">✔ Todas as alterações de notas foram salvas com sucesso!</span>
        </div>
      )}

      {/* Lock alerts for Teachers */}
      {isLocked && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs flex items-center gap-2">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            {isAutoLockedDefinitive 
              ? `Este diário acadêmico está BLOQUEADO AUTOMATICAMENTE devido à data limite (${calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date?.split('-').reverse().join('/')}).`
              : 'Este diário acadêmico está FECHADO DEFINITIVAMENTE para edições. Apenas a secretaria acadêmica pode alterar as notas.'}
          </span>
        </div>
      )}

      {!isLocked && isS1Locked && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs flex items-center gap-2">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            {isAutoLockedS1
              ? `O lançamento de notas do módulo S1 (AV1, AV2, AV3, REC S1) está BLOQUEADO AUTOMATICAMENTE devido à data limite (${calendarEvents.find(e => e.type === 'CLOSING_S1')?.date?.split('-').reverse().join('/')}).`
              : 'O lançamento de notas do módulo S1 está FECHADO por decisão da coordenação.'}
          </span>
        </div>
      )}

      {!isLocked && isS2Locked && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs flex items-center gap-2">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>
            {isAutoLockedS2
              ? `O lançamento de notas do módulo S2 (AV4, AV5, AV6, REC S2) está BLOQUEADO AUTOMATICAMENTE devido à data limite (${calendarEvents.find(e => e.type === 'CLOSING_S2')?.date?.split('-').reverse().join('/')}).`
              : 'O lançamento de notas do módulo S2 está FECHADO por decisão da coordenação.'}
          </span>
        </div>
      )}

      {/* Main spreadsheet grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider select-none h-11">
                <th className="py-3 px-2 w-[45px] min-w-[45px] max-w-[45px] text-center sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-750 z-20">Nº</th>
                <th className="py-3 px-2 w-[95px] min-w-[95px] max-w-[95px] sticky left-[45px] bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-750 z-20">Matrícula</th>
                <th className="py-3 px-3 w-[200px] min-w-[200px] max-w-[200px] sticky left-[140px] bg-slate-50 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 z-20">Aluno(a)</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV1</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV2</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV3</th>
                <th className="py-3 px-2 text-center w-[75px] bg-amber-50/20 dark:bg-amber-950/10 text-amber-700">Rec S1</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100 dark:bg-slate-800/50 font-black">S1</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV4</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV5</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100/40 dark:bg-slate-800/20">AV6</th>
                <th className="py-3 px-2 text-center w-[75px] bg-amber-50/20 dark:bg-amber-950/10 text-amber-700">Rec S2</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-100 dark:bg-slate-800/50 font-black">S2</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-50 dark:bg-slate-800/30">EX</th>
                <th className="py-3 px-2 text-center w-[70px] bg-slate-50 dark:bg-slate-800/30">CS</th>
                <th className="py-3 px-2 text-center w-[75px] bg-slate-50 dark:bg-slate-800/30">AFC</th>
                <th className="py-3 px-2 text-center w-[80px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black">Final PF</th>
                <th className="py-3 px-2 text-center w-[60px] font-bold">Conc</th>
                <th className="py-3 px-3 text-right w-[100px] font-bold">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
              {classStudents.map((stud, idx) => {
                const grade = journalGrades.find(g => g.studentId === stud.id);
                if (!grade) return null;

                const isTransferred = stud.classId !== targetClass.id;

                const s1Part = getS1Evaluations(grade);
                const s2Part = getS2Evaluations(grade);
                const absStats = getStudentAbsences(stud.id, targetSubject.id);
                const isEvenRow = idx % 2 === 1;

                return (
                  <tr 
                    key={stud.id} 
                    onMouseEnter={() => setHoveredRow(stud.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-all ${
                      hoveredRow === stud.id 
                        ? 'bg-slate-50/80 dark:bg-slate-800/40' 
                        : 'odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/20 dark:even:bg-slate-800/10'
                    } ${isTransferred ? 'opacity-75 bg-amber-50/10 dark:bg-amber-950/5' : ''}`}
                  >
                    {/* Index */}
                    <td className={`py-2.5 px-2 text-center text-slate-400 font-mono sticky left-0 border-r border-slate-200 dark:border-slate-750 z-10 w-[45px] min-w-[45px] max-w-[45px] transition-colors ${
                      hoveredRow === stud.id 
                        ? 'bg-slate-100 dark:bg-slate-850' 
                        : isEvenRow 
                          ? 'bg-slate-50/70 dark:bg-slate-800/30' 
                          : 'bg-white dark:bg-slate-900'
                    }`}>{idx + 1}</td>
                    
                    {/* Matricula */}
                    <td className={`py-2.5 px-2 font-mono text-slate-500 dark:text-slate-400 sticky left-[45px] border-r border-slate-200 dark:border-slate-750 z-10 w-[95px] min-w-[95px] max-w-[95px] transition-colors ${
                      hoveredRow === stud.id 
                        ? 'bg-slate-100 dark:bg-slate-850' 
                        : isEvenRow 
                          ? 'bg-slate-50/70 dark:bg-slate-800/30' 
                          : 'bg-white dark:bg-slate-900'
                    }`}>{stud.enrollment}</td>
                    
                    {/* Student Name */}
                    <td className={`py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-[140px] border-r-2 border-slate-300 dark:border-slate-700 z-10 w-[200px] min-w-[200px] max-w-[200px] transition-colors ${
                      hoveredRow === stud.id 
                        ? 'bg-slate-100 dark:bg-slate-850' 
                        : isEvenRow 
                          ? 'bg-slate-50/70 dark:bg-slate-800/30' 
                          : 'bg-white dark:bg-slate-900'
                    }`}>
                      <div className="flex flex-col min-w-0 max-w-[190px]">
                        <span className="truncate" title={stud.name}>{stud.name}</span>
                        {isTransferred && (
                          <span className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider mt-0.5 leading-tight">
                            Transferido p/ {classes.find(c => c.id === stud.classId)?.name || 'outra sala'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AV1 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS1Locked || isTransferred}
                        value={grade.av1 !== null ? grade.av1 : s1Part.av1}
                        onChange={(e) => handleValueChange(grade.id, 'av1', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* AV2 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS1Locked || isTransferred}
                        value={grade.av2 !== null ? grade.av2 : s1Part.av2}
                        onChange={(e) => handleValueChange(grade.id, 'av2', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* AV3 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS1Locked || isTransferred}
                        value={grade.av3 !== null ? grade.av3 : s1Part.av3}
                        onChange={(e) => handleValueChange(grade.id, 'av3', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* REC S1 */}
                    <td className="py-2.5 px-1 text-center bg-amber-50/10 dark:bg-amber-950/5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS1Locked || isTransferred}
                        placeholder="-"
                        value={grade.recS1 !== null ? grade.recS1 : ''}
                        onChange={(e) => handleValueChange(grade.id, 'recS1', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-amber-700 dark:text-amber-400 text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed placeholder-slate-300 dark:placeholder-slate-600"
                      />
                    </td>

                    {/* S1 calculated */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/80 dark:bg-slate-800/60 font-black font-mono">
                      {grade.s1.toFixed(1)}
                    </td>

                    {/* AV4 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS2Locked || isTransferred}
                        value={grade.av4 !== null ? grade.av4 : s2Part.av4}
                        onChange={(e) => handleValueChange(grade.id, 'av4', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* AV5 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS2Locked || isTransferred}
                        value={grade.av5 !== null ? grade.av5 : s2Part.av5}
                        onChange={(e) => handleValueChange(grade.id, 'av5', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* AV6 */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/20 dark:bg-slate-800/10">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS2Locked || isTransferred}
                        value={grade.av6 !== null ? grade.av6 : s2Part.av6}
                        onChange={(e) => handleValueChange(grade.id, 'av6', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed"
                      />
                    </td>

                    {/* REC S2 */}
                    <td className="py-2.5 px-1 text-center bg-amber-50/10 dark:bg-amber-950/5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isS2Locked || isTransferred}
                        placeholder="-"
                        value={grade.recS2 !== null ? grade.recS2 : ''}
                        onChange={(e) => handleValueChange(grade.id, 'recS2', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-amber-700 dark:text-amber-400 text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed placeholder-slate-300 dark:placeholder-slate-600"
                      />
                    </td>

                    {/* S2 calculated */}
                    <td className="py-2.5 px-1 text-center bg-slate-100/80 dark:bg-slate-800/60 font-black font-mono">
                      {grade.s2.toFixed(1)}
                    </td>

                    {/* EX (Extra) */}
                    <td className="py-2.5 px-1 text-center bg-slate-50/50 dark:bg-slate-800/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isTransferred}
                        placeholder="-"
                        value={grade.extra !== null ? grade.extra : ''}
                        onChange={(e) => handleValueChange(grade.id, 'extra', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed placeholder-slate-300 dark:placeholder-slate-600"
                      />
                    </td>

                    {/* CS (Conselho) */}
                    <td className="py-2.5 px-1 text-center bg-slate-50/50 dark:bg-slate-800/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isTransferred}
                        placeholder="-"
                        value={grade.conselho !== null ? grade.conselho : ''}
                        onChange={(e) => handleValueChange(grade.id, 'conselho', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-purple-700 dark:text-purple-400 text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed placeholder-slate-300 dark:placeholder-slate-600"
                      />
                    </td>

                    {/* AFC */}
                    <td className="py-2.5 px-1 text-center bg-slate-50/50 dark:bg-slate-800/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={isLocked || isTransferred}
                        placeholder="-"
                        value={grade.afc !== null ? grade.afc : ''}
                        onChange={(e) => handleValueChange(grade.id, 'afc', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-11 h-7 px-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-white text-center rounded-md focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none font-mono font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/40 disabled:cursor-not-allowed placeholder-slate-300 dark:placeholder-slate-600"
                      />
                    </td>

                    {/* PF (Pontuação Final) */}
                    <td className="py-2.5 px-1 text-center bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-black font-mono">
                      {grade.pf.toFixed(1)}
                    </td>

                    {/* Concept */}
                    <td className="py-2.5 px-1 text-center font-black">
                      {grade.concept}
                    </td>

                    {/* Result */}
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                        grade.result === 'APTO' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                          : grade.result === 'F. NOTA'
                            ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {grade.result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printing Modal */}
      {printDoc && (
        <PrintModal
          documentType={printDoc.type}
          classId={targetClass.id}
          subjectId={targetSubject.id}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
};
