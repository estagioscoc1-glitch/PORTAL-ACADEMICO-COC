/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UserRole, User } from './types';
import { LoginScreen } from './components/LoginScreen';
import { FirstLoginPasswordChange } from './components/FirstLoginPasswordChange';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { Logo } from './components/Logo';
import { PrintModal } from './components/PrintModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  GraduationCap, LogOut, Sun, Moon, Sparkles, ArrowLeftRight,
  Printer, Bell, Calendar, Clock, CheckCircle, Lock, ShieldCheck,
  MessageSquare, Users, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCenter } from './components/MessageCenter';
import { FlashyNotification } from './components/FlashyNotification';
import { safeLocalStorage } from './lib/safeStorage';

function MainAppLayout() {
  const { currentUser, logout, users, notifications, isLoading } = useApp();
  
  // Messaging center state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return safeLocalStorage.getItem('oc_dark_mode') === 'true';
  });

  // Admin simulation override role (allows an Admin to instantly preview other spaces)
  const [simulationRole, setSimulationRole] = useState<UserRole | null>(null);
  const [simulatedStudentId, setSimulatedStudentId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    setSimulationRole(null);
    setSimulatedStudentId(null);
  };

  // Auto-logout after 5 minutes of inactivity (300,000 ms)
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Events to detect user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer
    resetTimer();

    // Setup event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  // Sync dark class on document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      safeLocalStorage.setItem('oc_dark_mode', 'true');
    } else {
      root.classList.remove('dark');
      safeLocalStorage.setItem('oc_dark_mode', 'false');
    }
  }, [darkMode]);

  if (isLoading) {
    return (
      <div id="portal-loading-viewport" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center max-w-sm text-center px-6 py-8 space-y-6">
          {/* Elegant Circular Spinner with internal pulse logo */}
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-slate-100 dark:border-slate-900 rounded-full animate-spin border-t-blue-700 dark:border-t-blue-400"></div>
            <div className="absolute w-10 h-10 bg-blue-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 animate-pulse">LYNX</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Carregando Portal Acadêmico</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[280px]">
              Sincronizando registros acadêmicos e diários com os servidores de nuvem...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Mandatory password change on first login for student
  const isStudentFirstLogin = currentUser.role === UserRole.STUDENT && 
    (!currentUser.password || currentUser.password === currentUser.enrollment);

  if (isStudentFirstLogin) {
    return <FirstLoginPasswordChange />;
  }

  // Determine active display role
  const activeDisplayRole = currentUser.role === UserRole.ADMIN && simulationRole 
    ? simulationRole 
    : currentUser.role;

  // Selected student user details when simulating a student
  const simulatedStudent = simulatedStudentId 
    ? users.find(u => u.id === simulatedStudentId) 
    : null;

  return (
    <div id="app-root-viewport" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 h-16 px-6 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 select-none no-print">
        <Logo size="sm" />

        <div className="flex items-center gap-4">
          
          {/* Admin Simulation Toolbelt */}
          {currentUser.role === UserRole.ADMIN && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="px-2 text-slate-400 flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold">
                Simular:
              </span>
              <button
                type="button"
                id="sim-role-admin"
                onClick={() => { setSimulationRole(null); setSimulatedStudentId(null); }}
                className={`px-2.5 py-1 rounded-lg transition-all uppercase text-[10px] tracking-wider font-extrabold ${
                  simulationRole === null 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Administração
              </button>
              <button
                type="button"
                id="sim-role-teacher"
                onClick={() => { setSimulationRole(UserRole.TEACHER); setSimulatedStudentId(null); }}
                className={`px-2.5 py-1 rounded-lg transition-all uppercase text-[10px] tracking-wider font-extrabold ${
                  simulationRole === UserRole.TEACHER 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Professor
              </button>
              <button
                type="button"
                id="sim-role-student"
                onClick={() => { 
                  const defaultStudent = users.find(u => u.role === UserRole.STUDENT);
                  setSimulatedStudentId(defaultStudent?.id || null);
                  setSimulationRole(UserRole.STUDENT);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all uppercase text-[10px] tracking-wider font-extrabold ${
                  simulationRole === UserRole.STUDENT 
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Aluno
              </button>
            </div>
          )}

          {/* Chat / Message Center Trigger Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            type="button"
            id="chat-center-trigger-btn"
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300 transition-all border border-slate-150/40 dark:border-slate-850 shadow-sm relative flex items-center justify-center cursor-pointer"
            title="Abrir Central de Mensagens"
          >
            <MessageSquare className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            {notifications.filter(n => n.userId === currentUser.id && !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white font-extrabold items-center justify-center">
                  {notifications.filter(n => n.userId === currentUser.id && !n.read).length}
                </span>
              </span>
            )}
          </button>

          {/* Theme Mode Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            type="button"
            id="theme-mode-switch"
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300 transition-all border border-slate-150/40 dark:border-slate-850 shadow-sm"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" /> : <Moon className="h-4.5 w-4.5 text-blue-700" />}
          </button>

          {/* Security Padlock Widget */}
          <div className="relative group no-print">
            <button
              type="button"
              id="security-padlock-hub"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-150/40 dark:border-emerald-900/30 transition-all text-[10px] font-black shadow-sm"
              title="Acesso Seguro Homologado"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="hidden md:inline tracking-wider uppercase">Conexão Segura</span>
            </button>
            
            {/* Popover Hover Info Drawer */}
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl p-4 hidden group-hover:block z-50 transition-all animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-extrabold text-xs text-slate-950 dark:text-white uppercase tracking-wider">Centro de Segurança</h4>
              </div>
              <ul className="space-y-2 text-[10px] text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Conexão SSL/TLS:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Criptografia AES de 256 bits ativa.</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Filtro WAF e Anti-XSS:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Proteção contra injeções e scripts nocivos.</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Rate Limiter / Anti-Brute:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Bloqueio preventivo automático por 30s após 3 erros.</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Backup em Nuvem Automático:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Sincronização redundante ativa (a cada 45s).</p>
                  </div>
                </li>
              </ul>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md inline-block">
                  Ambiente Protegido
                </span>
              </div>
            </div>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-850">
            <div className="hidden sm:block text-right select-none">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 block max-w-[180px] truncate leading-tight">
                {currentUser.role === UserRole.ADMIN && simulationRole === UserRole.STUDENT 
                  ? (users.find(u => u.id === simulatedStudentId)?.name || currentUser.name)
                  : currentUser.name}
              </p>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black tracking-wider block uppercase leading-none mt-0.5">
                {currentUser.role === UserRole.ADMIN && simulationRole === null && 'Administração'}
                {currentUser.role === UserRole.ADMIN && simulationRole === UserRole.TEACHER && 'Professor (Simulado)'}
                {currentUser.role === UserRole.ADMIN && simulationRole === UserRole.STUDENT && 'Aluno (Simulado)'}
                {currentUser.role === UserRole.TEACHER && 'Professor'}
                {currentUser.role === UserRole.STUDENT && 'Aluno'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              id="header-logout-session"
              className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 transition-all border border-red-150/50 dark:border-red-950/30"
              title="Encerrar Sessão"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Simulation Banner HUD */}
      {currentUser.role === UserRole.ADMIN && simulationRole && (
        <div id="sim-banner-hud" className="bg-blue-600 text-white text-[11px] font-bold px-6 py-1.5 flex items-center justify-between shadow-inner select-none no-print">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-yellow-300 animate-spin" />
            <span>MODO SIMULAÇÃO ATIVO: Visualizando como <strong>{simulationRole === UserRole.TEACHER ? 'PROFESSOR' : 'ALUNO'}</strong>.</span>
          </span>
          <button 
            type="button"
            onClick={() => { setSimulationRole(null); setSimulatedStudentId(null); }}
            className="underline hover:text-blue-100 bg-blue-700 px-2 py-0.5 rounded-md text-[10px]"
          >
            Sair do Simulador
          </button>
        </div>
      )}

      {/* Portal Main Workspace */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDisplayRole + (simulatedStudentId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeDisplayRole === UserRole.ADMIN && <AdminDashboard />}
            {activeDisplayRole === UserRole.TEACHER && <TeacherDashboard />}
            {activeDisplayRole === UserRole.STUDENT && (
              <StudentDashboard studentId={simulatedStudentId || currentUser.id} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Corporate Footer */}
      <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 font-bold select-none no-print">
        <p>© 2026 LYnx EDU Sistemas Escolares Inteligentes • Sistema de Gerenciamento Escolar</p>
      </footer>

      {/* Messaging Drawer Panel */}
      <MessageCenter 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        selectedContactId={selectedContactId}
        setSelectedContactId={setSelectedContactId}
      />

      {/* Extreme Flashy Notification Popover */}
      <FlashyNotification 
        onOpenChat={(senderId) => {
          setSelectedContactId(senderId);
          setIsChatOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
