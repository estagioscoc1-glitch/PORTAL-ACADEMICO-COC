/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UploadCloud, Sparkles, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, Database, Undo2
} from 'lucide-react';
import { motion } from 'motion/react';

export const HistoricalDataImporter: React.FC = () => {
  const { importHistoricalData, undoHistoricalImports } = useApp();
  const [jsonInput, setJsonInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [importResult, setImportResult] = useState<{
    coursesCreated: number;
    classesCreated: number;
    subjectsCreated: number;
    studentsCreated: number;
    studentsRecognized: number;
    gradesImported: number;
  } | null>(null);
  const [undoSummary, setUndoSummary] = useState<{
    classesRemoved: number;
    studentsRemoved: number;
    gradesRemoved: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setFileError(null);
    setImportResult(null);
    setUndoSummary(null);
  };

  const processImport = () => {
    setFileError(null);
    setImportResult(null);
    setUndoSummary(null);

    if (!jsonInput.trim()) {
      setFileError('Por favor, cole o JSON ou faça upload de um arquivo.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const summary = importHistoricalData(parsed);
      setImportResult(summary);
      setJsonInput(''); // Clear input on success
    } catch (err) {
      setFileError(`Erro ao processar JSON: ${(err as Error).message}`);
    }
  };

  const handleUndoImport = () => {
    if (!window.confirm('Tem certeza de que deseja remover todas as turmas históricas importadas (closedDefinitive: true), suas notas e alunos vinculados exclusivamente a elas?')) {
      return;
    }
    setFileError(null);
    setImportResult(null);
    const summary = undoHistoricalImports();
    setUndoSummary(summary);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readJsonFile(file);
  };

  const readJsonFile = (file: File) => {
    setFileError(null);
    setImportResult(null);

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setFileError('O arquivo deve ser no formato JSON (.json).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Validate if it is valid JSON
        JSON.parse(text);
        setJsonInput(text);
      } catch (err) {
        setFileError('O arquivo carregado não contém um JSON válido.');
      }
    };
    reader.onerror = () => {
      setFileError('Erro ao ler o arquivo.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readJsonFile(file);
    }
  };

  const templateJson = {
    "classes": [
      {
        "className": "ADMINISTRAÇÃO HISTÓRICA A",
        "courseName": "Técnico em Administração",
        "shift": "MATUTINO",
        "module": 1,
        "year": 2024,
        "semester": 1,
        "subjects": [
          {
            "subjectName": "Introdução à Administração",
            "records": [
              {
                "studentName": "Fulano de Tal",
                "s1": 8.5,
                "s2": 9.0,
                "afc": null,
                "extra": null,
                "conselho": null,
                "pf": 8.8,
                "faltas": 4,
                "concept": "A",
                "result": "APTO"
              }
            ]
          }
        ]
      }
    ]
  };

  return (
    <div id="historical-data-importer-container" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-150 dark:border-slate-800 mt-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importador de Dados Históricos (JSON)</h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Adicione registros passados de turmas fechadas, notas finais, conceitos e faltas. O sistema irá automaticamente mapear ou criar cursos, turmas históricas (com fechamentos já consolidados), matérias e alunos, vinculando-os e preenchendo seus boletins.
      </p>

      {/* Accordion: Template JSON Schema */}
      <div className="mb-5 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/55 dark:hover:bg-slate-800/30 transition-all select-none"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Ver Formato e Exemplo do JSON Requerido
          </span>
          {showTemplate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTemplate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-600 dark:text-slate-300 bg-slate-100/30 dark:bg-slate-950/50"
          >
            <pre className="max-h-60 overflow-y-auto leading-relaxed text-[11px]">
              {JSON.stringify(templateJson, null, 2)}
            </pre>
            <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-normal not-italic font-sans">
              <p className="font-semibold mb-1">Notas importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Cursos</strong>: Se não houver curso com o nome correspondente, um novo será criado automaticamente.</li>
                <li><strong>Turmas</strong>: Serão criadas automaticamente se não existirem e marcadas como fechadas/concluídas por padrão.</li>
                <li><strong>Alunos</strong>: Mapeia alunos existentes pelo nome (comparações sem diferenciar maiúsculas/minúsculas e ignorando espaços extras). Se o aluno não existir no banco, ele será cadastrado automaticamente com um usuário e senha provisórios.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
            : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-750'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          className="hidden"
        />
        <UploadCloud className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Arraste e solte o arquivo .json aqui ou clique para selecionar
        </span>
        <span className="text-[10px] text-slate-400">
          Apenas arquivos JSON válidos (.json)
        </span>
      </div>

      {/* JSON Input Textarea */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          Ou cole o conteúdo JSON abaixo
        </label>
        <textarea
          value={jsonInput}
          onChange={handleJsonChange}
          placeholder='{ "classes": [ ... ] }'
          className="w-full h-44 px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-mono transition-all text-xs focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Error / Success Notifications */}
      {fileError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-150 dark:border-red-900/30 text-xs flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span>{fileError}</span>
        </motion.div>
      )}

      {importResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 text-xs"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-sm">Importação Concluída com Sucesso!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2 bg-white/40 dark:bg-slate-900/40 p-3 rounded-lg border border-emerald-200/30 font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cursos Criados</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.coursesCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Turmas Históricas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.classesCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Disciplinas Criadas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.subjectsCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Novos Alunos</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.studentsCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Alunos Reconhecidos</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.studentsRecognized}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Notas Importadas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.gradesImported}</p>
            </div>
          </div>
        </motion.div>
      )}

      {undoSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30 text-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span className="font-bold text-sm">Importações Históricas Desfeitas com Sucesso!</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            Todas as turmas com fechamento definitivo (closedDefinitive: true), suas notas e os alunos associados exclusivamente a elas foram removidos.
          </p>
          <div className="grid grid-cols-3 gap-2.5 mt-2 bg-white/40 dark:bg-slate-900/40 p-3 rounded-lg border border-amber-200/30 font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Turmas Removidas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-amber-400">{undoSummary.classesRemoved}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Alunos Removidos</p>
              <p className="text-sm font-bold text-slate-800 dark:text-amber-400">{undoSummary.studentsRemoved}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Notas Removidas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-amber-400">{undoSummary.gradesRemoved}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleUndoImport}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs border border-rose-200 dark:border-rose-800 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
        >
          <Undo2 className="h-4 w-4 text-rose-500" />
          <span>Desfazer Importações Históricas</span>
        </button>

        <button
          onClick={processImport}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider border-b-2 border-emerald-600"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Processar Importação Histórica</span>
        </button>
      </div>
    </div>
  );
};
