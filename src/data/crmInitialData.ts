import { 
  Lead, CRMTask, CRMScheduleEvent, CRMEmployee, 
  CRMTimelineItem, CRMAuditLog, CRMNotification, CRMAutomationRule 
} from '../types/crm';

export const initialCRMEmployees: CRMEmployee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Alberto Eduardo',
    role: 'Consultor Comercial Senior',
    phone: '(16) 99781-4432',
    email: 'carlos.eduardo@escola.com.br',
    username: 'carloseduardo',
    status: 'Ativo',
    isOnline: true,
  },
  {
    id: 'emp-2',
    name: 'Mariana Silva Souza',
    role: 'Supervisora de Matrículas',
    phone: '(16) 99812-3311',
    email: 'mariana.silva@escola.com.br',
    username: 'marianasilva',
    status: 'Ativo',
    isOnline: true,
  },
  {
    id: 'emp-3',
    name: 'Roberto Mendes',
    role: 'Atendente WhatsApp',
    phone: '(16) 99654-2200',
    email: 'roberto.mendes@escola.com.br',
    username: 'robertomendes',
    status: 'Ativo',
    isOnline: false,
  },
  {
    id: 'emp-4',
    name: 'Ana Paula Costa',
    role: 'Coordenadora de Vendas',
    phone: '(16) 99112-8877',
    email: 'ana.costa@escola.com.br',
    username: 'anacosta',
    status: 'Ativo',
    isOnline: true,
  }
];

export const initialCRMLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Lucas Gabriel Oliveira',
    phone: '(16) 99742-1020',
    whatsapp: '5516997421020',
    email: 'lucas.gabriel@gmail.com',
    interestCourse: 'Técnico em Enfermagem',
    origin: 'WhatsApp',
    createdAt: '2026-07-25 09:15',
    responsibleId: 'emp-1',
    responsibleName: 'Carlos Alberto Eduardo',
    status: 'Novo',
    notes: 'Interessado na turma da noite. Perguntou sobre bolsas e parcelamento.',
    tags: ['Noturno', 'Bolsa', 'Urgente'],
    priority: 'Alta',
    city: 'Ribeirão Preto',
    value: 4500,
    lastContactDate: '2026-07-25 09:15',
    nextFollowUpDate: '2026-07-26 10:00'
  },
  {
    id: 'lead-2',
    name: 'Fernanda Lima Rocha',
    phone: '(16) 98823-9988',
    whatsapp: '5516988239988',
    email: 'fernanda.rocha@outlook.com',
    interestCourse: 'Técnico em Informática',
    origin: 'Instagram',
    createdAt: '2026-07-24 14:30',
    responsibleId: 'emp-2',
    responsibleName: 'Mariana Silva Souza',
    status: 'Primeiro contato',
    notes: 'Enviada tabela de valores e matriz curricular no WhatsApp.',
    tags: ['TI', 'Vestibular'],
    priority: 'Média',
    city: 'Sertãozinho',
    value: 3800,
    lastContactDate: '2026-07-24 16:00',
    nextFollowUpDate: '2026-07-26 14:00'
  },
  {
    id: 'lead-3',
    name: 'Marcelo Rossi Santos',
    phone: '(16) 99105-4422',
    whatsapp: '5516991054422',
    email: 'mrossi@bol.com.br',
    interestCourse: 'Administração de Empresas',
    origin: 'Google',
    createdAt: '2026-07-23 11:20',
    responsibleId: 'emp-1',
    responsibleName: 'Carlos Alberto Eduardo',
    status: 'Em negociação',
    notes: 'Agendou visita presencial no campus para conhecer os laboratórios.',
    tags: ['Visita', 'EAD'],
    priority: 'Urgente',
    city: 'Ribeirão Preto',
    value: 5200,
    lastContactDate: '2026-07-25 11:00',
    nextFollowUpDate: '2026-07-27 09:30'
  },
  {
    id: 'lead-4',
    name: 'Juliana Paes de Andrade',
    phone: '(16) 99600-1122',
    whatsapp: '5516996001122',
    email: 'juliana.andrade@hotmail.com',
    interestCourse: 'Técnico em Radiologia',
    origin: 'Site',
    createdAt: '2026-07-22 17:45',
    responsibleId: 'emp-3',
    responsibleName: 'Roberto Mendes',
    status: 'Aguardando retorno',
    notes: 'Aguardando envio do histórico escolar para validação de equivalência.',
    tags: ['Histórico', 'Aguardando Doc'],
    priority: 'Média',
    city: 'Cravinhos',
    value: 4800,
    lastContactDate: '2026-07-23 10:00',
    nextFollowUpDate: '2026-07-26 15:30'
  },
  {
    id: 'lead-5',
    name: 'Guilherme Siqueira',
    phone: '(16) 99233-7766',
    whatsapp: '5516992337766',
    email: 'gui.siqueira@yahoo.com',
    interestCourse: 'Técnico em Edificações',
    origin: 'Indicação',
    createdAt: '2026-07-20 10:10',
    responsibleId: 'emp-2',
    responsibleName: 'Mariana Silva Souza',
    status: 'Documentação',
    notes: 'Falta apenas comprovante de residência atualizado para gerar contrato.',
    tags: ['Indicação de Ex-Aluno', 'Contrato'],
    priority: 'Alta',
    city: 'Ribeirão Preto',
    value: 4100,
    lastContactDate: '2026-07-25 08:30',
    nextFollowUpDate: '2026-07-26 11:00'
  },
  {
    id: 'lead-6',
    name: 'Beatriz Vasconcelos',
    phone: '(16) 98111-5544',
    whatsapp: '5516981115544',
    email: 'b.vasconcelos@gmail.com',
    interestCourse: 'Técnico em Enfermagem',
    origin: 'Visita presencial',
    createdAt: '2026-07-19 16:00',
    responsibleId: 'emp-4',
    responsibleName: 'Ana Paula Costa',
    status: 'Pré-matrícula',
    notes: 'Pré-matrícula paga via PIX. Agendada assinatura presencial do contrato.',
    tags: ['Matrícula Garantida', 'PIX'],
    priority: 'Urgente',
    city: 'Ribeirão Preto',
    value: 4500,
    lastContactDate: '2026-07-25 14:00',
    nextFollowUpDate: '2026-07-26 09:00'
  },
  {
    id: 'lead-7',
    name: 'Rafael Castro Barreto',
    phone: '(16) 99344-2211',
    whatsapp: '5516993442211',
    email: 'rafael.castro@gmail.com',
    interestCourse: 'Técnico em Estética',
    origin: 'Facebook',
    createdAt: '2026-07-18 13:20',
    responsibleId: 'emp-1',
    responsibleName: 'Carlos Alberto Eduardo',
    status: 'Matriculado',
    notes: 'Matrícula efetuada com sucesso. Aluno inserido na Turma EST-2026/2.',
    tags: ['Matriculado', 'Ativo'],
    priority: 'Baixa',
    city: 'Ribeirão Preto',
    value: 4200,
    lastContactDate: '2026-07-24 11:00'
  },
  {
    id: 'lead-8',
    name: 'Camila Pitanga',
    phone: '(16) 98800-3322',
    whatsapp: '5516988003322',
    email: 'camila.pitanga@gmail.com',
    interestCourse: 'Design Interiores',
    origin: 'Evento',
    createdAt: '2026-07-15 15:00',
    responsibleId: 'emp-3',
    responsibleName: 'Roberto Mendes',
    status: 'Perdido',
    notes: 'Optou por curso universitário presencial em outra cidade.',
    tags: ['Desistência', 'Outra Instituição'],
    priority: 'Baixa',
    city: 'Franca',
    value: 0,
    lastContactDate: '2026-07-21 14:00'
  }
];

export const initialCRMTasks: CRMTask[] = [
  {
    id: 'task-1',
    title: 'Ligar para Lucas Gabriel (Qualificação)',
    description: 'Apresentar condições especiais de bolsa de 25% para matrícula esta semana.',
    responsibleId: 'emp-1',
    responsibleName: 'Carlos Alberto Eduardo',
    createdAt: '2026-07-25 09:30',
    dueDate: '2026-07-26',
    dueTime: '10:00',
    priority: 'Alta',
    status: 'Pendente',
    category: 'Ligação',
    leadId: 'lead-1',
    leadName: 'Lucas Gabriel Oliveira',
    comments: [
      { id: 'c-1', author: 'Carlos Alberto Eduardo', text: 'Lead muito interessado, tentará parcelar no boleto.', createdAt: '2026-07-25 09:35' }
    ]
  },
  {
    id: 'task-2',
    title: 'Confirmar recebimento do histórico escolar - Juliana Paes',
    description: 'Solicitar via WhatsApp a cópia legível do histórico do Ensino Médio.',
    responsibleId: 'emp-3',
    responsibleName: 'Roberto Mendes',
    createdAt: '2026-07-24 11:00',
    dueDate: '2026-07-26',
    dueTime: '15:30',
    priority: 'Média',
    status: 'Em andamento',
    category: 'Documentos',
    leadId: 'lead-4',
    leadName: 'Juliana Paes de Andrade'
  },
  {
    id: 'task-3',
    title: 'Enviar Contrato de Matrícula - Beatriz Vasconcelos',
    description: 'Gerar minuta contratual e enviar link para assinatura digital DocuSign.',
    responsibleId: 'emp-4',
    responsibleName: 'Ana Paula Costa',
    createdAt: '2026-07-25 14:15',
    dueDate: '2026-07-26',
    dueTime: '09:00',
    priority: 'Urgente',
    status: 'Pendente',
    category: 'Matrícula',
    leadId: 'lead-6',
    leadName: 'Beatriz Vasconcelos'
  },
  {
    id: 'task-4',
    title: 'Relatório Semanal de Origem dos Leads',
    description: 'Consolidar métricas de conversão das campanhas do Google Ads e Instagram.',
    responsibleId: 'emp-2',
    responsibleName: 'Mariana Silva Souza',
    createdAt: '2026-07-23 08:00',
    dueDate: '2026-07-27',
    dueTime: '17:00',
    priority: 'Média',
    status: 'Pendente',
    category: 'Relatório'
  }
];

export const initialCRMEvents: CRMScheduleEvent[] = [
  {
    id: 'evt-1',
    title: 'Visita Técnica no Campus - Marcelo Rossi',
    type: 'Visita',
    date: '2026-07-26',
    time: '14:30',
    leadId: 'lead-3',
    leadName: 'Marcelo Rossi Santos',
    responsibleName: 'Carlos Alberto Eduardo',
    notes: 'Apresentar laboratório de informática e biblioteca central.'
  },
  {
    id: 'evt-2',
    title: 'Retorno Telefônico - Fernanda Lima',
    type: 'Retorno',
    date: '2026-07-26',
    time: '11:00',
    leadId: 'lead-2',
    leadName: 'Fernanda Lima Rocha',
    responsibleName: 'Mariana Silva Souza',
    notes: 'Verificar decisão da família em relação ao curso de Informática.'
  },
  {
    id: 'evt-3',
    title: 'Assinatura Presencial de Contrato - Beatriz',
    type: 'Prazo de matrícula',
    date: '2026-07-27',
    time: '10:00',
    leadId: 'lead-6',
    leadName: 'Beatriz Vasconcelos',
    responsibleName: 'Ana Paula Costa'
  }
];

export const initialCRMTimeline: CRMTimelineItem[] = [
  {
    id: 'time-1',
    leadId: 'lead-1',
    type: 'Mensagem',
    title: 'Primeira interação no WhatsApp',
    description: 'Lead solicitou informações sobre o curso Técnico em Enfermagem.',
    authorName: 'Carlos Alberto Eduardo',
    createdAt: '2026-07-25 09:15'
  },
  {
    id: 'time-2',
    leadId: 'lead-1',
    type: 'Observação',
    title: 'Qualificação de Perfil',
    description: 'Possui disponibilidade noturna e interesse imediato para início no 2º semestre.',
    authorName: 'Carlos Alberto Eduardo',
    createdAt: '2026-07-25 09:20'
  },
  {
    id: 'time-3',
    leadId: 'lead-3',
    type: 'Legação',
    title: 'Chamada Telefônica de 08 min',
    description: 'Alinhadas dúvidas sobre grade curricular e agendada visita ao campus.',
    authorName: 'Carlos Alberto Eduardo',
    createdAt: '2026-07-25 11:00'
  },
  {
    id: 'time-4',
    leadId: 'lead-6',
    type: 'Documento enviado',
    title: 'Comprovante de Pré-Matrícula PIX',
    description: 'Lead anexou comprovante de R$ 250,00 referente ao sinal da matrícula.',
    authorName: 'Ana Paula Costa',
    createdAt: '2026-07-25 14:00'
  }
];

export const initialCRMAuditLogs: CRMAuditLog[] = [
  {
    id: 'log-1',
    user: 'Carlos Alberto Eduardo',
    timestamp: '2026-07-25 14:22:10',
    action: 'Criação de Lead',
    details: 'Lead Lucas Gabriel Oliveira cadastrado via WhatsApp.',
    ip: '177.102.45.18'
  },
  {
    id: 'log-2',
    user: 'Ana Paula Costa',
    timestamp: '2026-07-25 14:02:05',
    action: 'Alteração de Status',
    details: 'Status do lead Beatriz Vasconcelos alterado para "Pré-matrícula".',
    ip: '177.102.45.22'
  },
  {
    id: 'log-3',
    user: 'Mariana Silva Souza',
    timestamp: '2026-07-25 11:45:00',
    action: 'Atribuição de Tarefa',
    details: 'Tarefa "Ligar para Lucas Gabriel" atribuída a Carlos Alberto Eduardo.',
    ip: '177.102.45.19'
  }
];

export const initialCRMNotifications: CRMNotification[] = [
  {
    id: 'notif-1',
    title: 'Novo Lead Recebido via WhatsApp',
    description: 'Lucas Gabriel Oliveira acabou de entrar em contato sobre Enfermagem.',
    timestamp: 'Hoje às 09:15',
    read: false,
    type: 'lead'
  },
  {
    id: 'notif-2',
    title: 'Tarefa Urgente Vencendo Hoje',
    description: 'Enviar Contrato de Matrícula para Beatriz Vasconcelos até as 09:00.',
    timestamp: 'Hoje às 08:00',
    read: false,
    type: 'task'
  },
  {
    id: 'notif-3',
    title: 'Lead Aguardando Retorno Há 2 Dias',
    description: 'Juliana Paes de Andrade aguarda validação de histórico escolar.',
    timestamp: 'Ontem às 17:00',
    read: true,
    type: 'reminder'
  }
];

export const initialCRMAutomations: CRMAutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Atribuição Automática de Novo Lead',
    trigger: 'Quando um novo lead entrar via WhatsApp ou Site',
    action: 'Atribuir ao consultor comercial disponível no rodízio e criar tarefa de contato em até 15 minutos.',
    active: true,
    description: 'Garante atendimento imediato reduzindo tempo de resposta inicial.'
  },
  {
    id: 'auto-2',
    name: 'Alerta de Lead Parado (Follow-up Vencido)',
    trigger: 'Lead na etapa "Em negociação" sem contato há mais de 48 horas',
    action: 'Notificar o gestor de vendas e marcar a tarefa com prioridade URGENTE.',
    active: true,
    description: 'Evita a perda de vendas por esquecimento no funil.'
  },
  {
    id: 'auto-3',
    name: 'Boas-Vindas Automáticas por WhatsApp',
    trigger: 'Lead preencher formulário na Landing Page',
    action: 'Enviar mensagem instantânea no WhatsApp com catálogo de cursos e link de agendamento.',
    active: true,
    description: 'Automação de engajamento imediato.'
  }
];
