/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { LogIn, GraduationCap, Users, ShieldAlert, KeyRound, ArrowRight, BookOpen, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [username, setUsername] = useState('');
  const [cpfOrEnrollment, setCpfOrEnrollment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Short artificial delay for smooth UX loading states
      await new Promise(resolve => setTimeout(resolve, 600));
      const val = role === UserRole.ADMIN ? (cpfOrEnrollment || 'admin') : cpfOrEnrollment;
      const success = await login(username, val, role);
      if (!success) {
        setError(
          role === UserRole.ADMIN 
            ? 'Usuário ou senha incorretos para Administrador.' 
            : role === UserRole.TEACHER 
              ? 'Nome de usuário ou CPF incorretos.' 
              : 'Matrícula ou senha padrão incorretos.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor acadêmico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen-root" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-12 min-h-[600px] border border-slate-100 dark:border-slate-800">
        
        {/* Left Side: Brand & Welcome */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Decorative Circles */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-center justify-start">
            <Logo size="sm" light />
          </div>

          <div className="relative z-10 my-8">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight mb-4 text-white">
              Sistema de<br />Gerenciamento<br />Escolar
            </h2>
            <div className="h-1.5 w-12 bg-blue-400 rounded-full mb-6"></div>
            <p className="text-sm text-blue-100 leading-relaxed max-w-sm">
              Bem-vindo ao Portal Acadêmico Integrado. Acesse seus diários de notas, frequências, boletins e indicadores institucionais em tempo real.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 text-xs text-blue-300 flex justify-between items-center">
            <span>Versão 1.0</span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Educação Técnica
            </span>
          </div>
        </div>

        {/* Right Side: Authentication Forms */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Portal Acadêmico</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Selecione seu perfil de acesso abaixo</p>
            </div>

            {/* Role Selectors */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
              <button
                type="button"
                id="role-student-btn"
                onClick={() => { setRole(UserRole.STUDENT); setError(''); }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 ${
                  role === UserRole.STUDENT
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-200 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Aluno</span>
              </button>
              <button
                type="button"
                id="role-teacher-btn"
                onClick={() => { setRole(UserRole.TEACHER); setError(''); }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 ${
                  role === UserRole.TEACHER
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-200 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Professor</span>
              </button>
              <button
                type="button"
                id="role-admin-btn"
                onClick={() => { setRole(UserRole.ADMIN); setError(''); }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 ${
                  role === UserRole.ADMIN
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-200 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Administração</span>
              </button>
            </div>

            {/* Login Error Notification */}
            {error && (
              <div id="login-error-alert" className="p-4 mb-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form fields */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {role === UserRole.STUDENT 
                    ? 'Matrícula do Aluno' 
                    : role === UserRole.TEACHER 
                      ? 'Usuário do Professor' 
                      : 'Usuário Administrativo'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    {role === UserRole.STUDENT ? <GraduationCap className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </span>
                  <input
                    type="text"
                    id="login-username-input"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === UserRole.STUDENT ? 'Digite sua matrícula' : 'Digite seu usuário'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
                  />
                </div>
              </div>

              {role !== UserRole.ADMIN && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {role === UserRole.TEACHER ? 'Senha de Acesso' : 'Senha (Mesmo número da Matrícula)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <input
                      type="password"
                      id="login-password-input"
                      required
                      value={cpfOrEnrollment}
                      onChange={(e) => setCpfOrEnrollment(e.target.value)}
                      placeholder={role === UserRole.TEACHER ? 'Digite sua senha' : 'Padrão: sua matrícula'}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {role === UserRole.ADMIN && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Senha Administrativa
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <input
                      type="password"
                      id="login-admin-password-input"
                      required
                      value={cpfOrEnrollment}
                      onChange={(e) => setCpfOrEnrollment(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {role === UserRole.STUDENT && "Primeiro acesso: Use sua matrícula nos dois campos"}
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={loading}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-800/50 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 text-sm font-sans"
              >
                {loading ? (
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Acessar Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
