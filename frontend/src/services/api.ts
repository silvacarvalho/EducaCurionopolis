/**
 * API Service
 * Axios instance configured for EDUCA+ Curionópolis backend
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// API ENDPOINTS
// ============================================

export const authAPI = {
  login: (email: string, senha: string) =>
    api.post('/auth/login-json', { email, senha }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const usuariosAPI = {
  list: (params?: any) => api.get('/usuarios', { params }),
  get: (id: number) => api.get(`/usuarios/${id}`),
  create: (data: any) => api.post('/usuarios', data),
  update: (id: number, data: any) => api.put(`/usuarios/${id}`, data),
  delete: (id: number) => api.delete(`/usuarios/${id}`),
  resetPassword: (id: number) => api.post(`/usuarios/reset-password/${id}`),
  resetPasswordBulk: (ids: number[]) =>
    api.post('/usuarios/reset-password-bulk', { usuario_ids: ids }),
  changePassword: (senhaAtual: string, senhaNova: string) =>
    api.post('/usuarios/change-password', {
      senha_atual: senhaAtual,
      senha_nova: senhaNova,
    }),
};

export const escolasAPI = {
  list: (params?: any) => api.get('/escolas', { params }),
  get: (id: number) => api.get(`/escolas/${id}`),
  create: (data: any) => api.post('/escolas', data),
  update: (id: number, data: any) => api.put(`/escolas/${id}`, data),
  delete: (id: number) => api.delete(`/escolas/${id}`),
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/escolas/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const diretoresAPI = {
  list: (params?: any) => api.get('/diretores', { params }),
  get: (id: number) => api.get(`/diretores/${id}`),
  create: (data: any) => api.post('/diretores', data),
  update: (id: number, data: any) => api.put(`/diretores/${id}`, data),
  delete: (id: number) => api.delete(`/diretores/${id}`),
  getEscola: (id: number) => api.get(`/diretores/${id}/escola`),
};

export const professoresAPI = {
  list: (params?: any) => api.get('/professores', { params }),
  get: (id: number) => api.get(`/professores/${id}`),
  create: (data: any) => api.post('/professores', data),
  update: (id: number, data: any) => api.put(`/professores/${id}`, data),
  delete: (id: number) => api.delete(`/professores/${id}`),
};

export const turmasAPI = {
  list: (params?: any) => api.get('/turmas', { params }),
  get: (id: number) => api.get(`/turmas/${id}`),
  create: (data: any) => api.post('/turmas', data),
  update: (id: number, data: any) => api.put(`/turmas/${id}`, data),
  delete: (id: number) => api.delete(`/turmas/${id}`),
};

export const disciplinasAPI = {
  list: (params?: any) => api.get('/disciplinas', { params }),
  create: (data: any) => api.post('/disciplinas', data),
  update: (id: number, data: any) => api.put(`/disciplinas/${id}`, data),
  delete: (id: number) => api.delete(`/disciplinas/${id}`),
  vincularProfessor: (professorId: number, disciplinaId: number) =>
    api.post('/disciplinas/vincular-professor', {
      professor_id: professorId,
      disciplina_id: disciplinaId,
    }),
  desvincularProfessor: (professorId: number, disciplinaId: number) =>
    api.delete('/disciplinas/desvincular-professor', {
      data: { professor_id: professorId, disciplina_id: disciplinaId },
    }),
};

export const alunosAPI = {
  list: (params?: any) => api.get('/alunos', { params }),
  get: (id: number) => api.get(`/alunos/${id}`),
  create: (data: any) => api.post('/alunos', data),
  update: (id: number, data: any) => api.put(`/alunos/${id}`, data),
  delete: (id: number) => api.delete(`/alunos/${id}`),
};

export const avaliacoesAPI = {
  list: (params?: any) => api.get('/avaliacoes', { params }),
  get: (id: number) => api.get(`/avaliacoes/${id}`),
  create: (data: any) => api.post('/avaliacoes', data),
  createBulk: (avaliacoes: any[]) =>
    api.post('/avaliacoes/bulk', { avaliacoes }),
  update: (id: number, data: any) => api.put(`/avaliacoes/${id}`, data),
  delete: (id: number) => api.delete(`/avaliacoes/${id}`),
};

export const avaliacoesAgregadasAPI = {
  list: (params?: any) => api.get('/avaliacoes-agregadas', { params }),
  get: (id: number) => api.get(`/avaliacoes-agregadas/${id}`),
  create: (data: any) => api.post('/avaliacoes-agregadas', data),
  update: (id: number, data: any) => api.put(`/avaliacoes-agregadas/${id}`, data),
  delete: (id: number) => api.delete(`/avaliacoes-agregadas/${id}`),
};

export const diagnosticosAPI = {
  // Itens de diagnóstico
  listItens: (params?: any) => api.get('/diagnosticos/itens', { params }),
  getItem: (id: number) => api.get(`/diagnosticos/itens/${id}`),
  createItem: (data: any) => api.post('/diagnosticos/itens', data),
  updateItem: (id: number, data: any) => api.put(`/diagnosticos/itens/${id}`, data),
  deleteItem: (id: number) => api.delete(`/diagnosticos/itens/${id}`),

  // Diagnósticos
  list: (params?: any) => api.get('/diagnosticos', { params }),
  get: (id: number) => api.get(`/diagnosticos/${id}`),
  create: (data: any) => api.post('/diagnosticos', data),
  update: (id: number, data: any) => api.put(`/diagnosticos/${id}`, data),
  vincularItens: (diagnosticoId: number, itemIds: number[]) =>
    api.post(`/diagnosticos/${diagnosticoId}/vincular-itens`, { item_ids: itemIds }),
  substituir: (antigoId: number, novoDiagnostico: any) =>
    api.post('/diagnosticos/substituir', {
      diagnostico_antigo_id: antigoId,
      novo_diagnostico: novoDiagnostico,
    }),

  // Resultados
  listResultados: (params?: any) => api.get('/diagnosticos/resultados', { params }),
  createResultado: (data: any) => api.post('/diagnosticos/resultados', data),
  updateResultado: (id: number, data: any) =>
    api.put(`/diagnosticos/resultados/${id}`, data),

  // Relatórios
  relatorioPorEixo: (diagnosticoId: number, params?: any) =>
    api.get(`/diagnosticos/relatorios/por-eixo/${diagnosticoId}`, { params }),
};

export const saebAPI = {
  // Provas
  listProvas: (params?: any) => api.get('/saeb/provas', { params }),
  getProva: (id: number) => api.get(`/saeb/provas/${id}`),
  createProva: (data: any) => api.post('/saeb/provas', data),
  updateProva: (id: number, data: any) => api.put(`/saeb/provas/${id}`, data),
  // Resultados
  listResultados: (params?: any) => api.get('/saeb/resultados', { params }),
  getResultado: (id: number) => api.get(`/saeb/resultados/${id}`),
  createResultado: (data: any) => api.post('/saeb/resultados', data),
  createResultadosBulk: (resultados: any[]) =>
    api.post('/saeb/resultados/bulk', { resultados }),
  updateResultado: (id: number, data: any) =>
    api.put(`/saeb/resultados/${id}`, data),
};

export const mensagensAPI = {
  getInbox: (params?: any) => api.get('/mensagens/inbox', { params }),
  getSent: (params?: any) => api.get('/mensagens/sent', { params }),
  get: (id: number) => api.get(`/mensagens/${id}`),
  getThread: (id: number) => api.get(`/mensagens/thread/${id}`),
  getDestinatarios: () => api.get('/mensagens/destinatarios'),
  getContador: () => api.get('/mensagens/contador'),
  send: (data: any) => api.post('/mensagens', data),
  broadcastTodos: (data: any) => api.post('/mensagens/broadcast-todos', data),
  broadcastDiretores: (data: any) =>
    api.post('/mensagens/broadcast-diretores', data),
  broadcastProfessores: (data: any) =>
    api.post('/mensagens/broadcast-professores', data),
  markAsRead: (id: number) => api.post(`/mensagens/${id}/mark-read`),
  markAllAsRead: () => api.post('/mensagens/mark-all-read'),
  delete: (id: number) => api.delete(`/mensagens/${id}`),
};

// Get WebSocket URL
export const getWebSocketUrl = (userId: number, token: string): string => {
  const wsBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');
  return `${wsBaseUrl}/ws/${userId}?token=${token}`;
};

export const relatoriosAPI = {
  // Avaliações (Individual - Professor)
  avaliacaoGeral: (params?: any) =>
    api.get('/relatorios/avaliacoes/geral', { params }),
  avaliacaoDrillDownEscolas: (params?: any) =>
    api.get('/relatorios/avaliacoes/drill-down/escolas', { params }),
  avaliacaoDrillDownTurmas: (escolaId: number, params?: any) =>
    api.get(`/relatorios/avaliacoes/drill-down/turmas/${escolaId}`, { params }),

  // Avaliações Agregadas (Diretor/Coordenador)
  avaliacaoAgregadaGeral: (params?: any) =>
    api.get('/relatorios/avaliacoes-agregadas/geral', { params }),
  avaliacaoAgregadaDrillDownEscolas: (params?: any) =>
    api.get('/relatorios/avaliacoes-agregadas/drill-down/escolas', { params }),
  avaliacaoAgregadaDrillDownTurmas: (escolaId: number, params?: any) =>
    api.get(`/relatorios/avaliacoes-agregadas/drill-down/turmas/${escolaId}`, { params }),
  avaliacaoAgregadaDetalhamento: (turmaId: number, params?: any) =>
    api.get(`/relatorios/avaliacoes-agregadas/detalhamento/${turmaId}`, { params }),

  // Diagnósticos
  diagnosticoGeral: (params?: any) =>
    api.get('/relatorios/diagnosticos/geral', { params }),

  // SAEB
  saebGeral: (params?: any) => api.get('/relatorios/saeb/geral', { params }),

  // Públicos
  publicoAvaliacoes: (params?: any) =>
    api.get('/relatorios/publico/avaliacoes', { params }),
  publicoDiagnosticos: (params?: any) =>
    api.get('/relatorios/publico/diagnosticos', { params }),
};

export const configuracoesGraficoAPI = {
  get: () => api.get('/configuracoes-grafico'),
  create: (data: any) => api.post('/configuracoes-grafico', data),
  update: (data: any) => api.put('/configuracoes-grafico', data),
  reset: () => api.post('/configuracoes-grafico/reset'),
};

// ============================================
// SAEB V2 API
// ============================================

// Create a separate API instance for V2
const apiV2 = axios.create({
  baseURL: `${API_BASE_URL}/api/v2`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Copy interceptors from V1
apiV2.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const saebV2API = {
  // Configurações SAEB
  listConfiguracoes: () => apiV2.get('/saeb/configuracoes'),
  getConfiguracao: (anoEscolar: number) => apiV2.get(`/saeb/configuracoes/${anoEscolar}`),
  createConfiguracao: (data: any) => apiV2.post('/saeb/configuracoes', data),
  updateConfiguracao: (anoEscolar: number, data: any) => apiV2.put(`/saeb/configuracoes/${anoEscolar}`, data),
  deleteConfiguracao: (anoEscolar: number) => apiV2.delete(`/saeb/configuracoes/${anoEscolar}`),

  // Descritores
  listDescritores: (params?: any) => apiV2.get('/saeb/descritores', { params }),
  getDescritor: (id: number) => apiV2.get(`/saeb/descritores/${id}`),
  createDescritor: (data: any) => apiV2.post('/saeb/descritores', data),
  updateDescritor: (id: number, data: any) => apiV2.put(`/saeb/descritores/${id}`, data),
  deleteDescritor: (id: number) => apiV2.delete(`/saeb/descritores/${id}`),
  downloadTemplateDescritores: () => apiV2.get('/saeb/descritores/template', {
    responseType: 'blob'
  }),
  importDescritores: (formData: FormData) => apiV2.post('/saeb/descritores/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Questões
  listQuestoes: (params?: any) => apiV2.get('/saeb/questoes', { params }),
  getQuestao: (id: number, includeGabarito?: boolean) =>
    apiV2.get(`/saeb/questoes/${id}`, { params: { include_gabarito: includeGabarito } }),
  createQuestao: (data: any) => apiV2.post('/saeb/questoes', data),
  updateQuestao: (id: number, data: any) => apiV2.put(`/saeb/questoes/${id}`, data),
  deleteQuestao: (id: number) => apiV2.delete(`/saeb/questoes/${id}`),
  importQuestoes: (formData: FormData) => apiV2.post('/saeb/questoes/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Simulados
  listSimulados: (params?: any) => apiV2.get('/saeb/simulados', { params }),
  getSimulado: (id: number) => apiV2.get(`/saeb/simulados/${id}`),
  createSimulado: (data: any) => apiV2.post('/saeb/simulados', data),
  updateSimulado: (id: number, data: any) => apiV2.put(`/saeb/simulados/${id}`, data),
  getSimuladoQuestoes: (id: number) => apiV2.get(`/saeb/simulados/${id}/questoes`),

  // Participações (Professor)
  createParticipacao: (data: any) => apiV2.post('/saeb/participacoes', data),
  listMinhasParticipacoes: () => apiV2.get('/saeb/participacoes/minhas-turmas'),

  // Simulados Disponíveis (Aluno)
  listSimuladosDisponiveis: () => apiV2.get('/saeb/simulados/disponiveis'),

  // Respostas (Aluno)
  submitResposta: (data: any) => apiV2.post('/saeb/respostas', data),
  submitRespostasBulk: (data: any) => apiV2.post('/saeb/respostas/bulk', data),
  getMinhasRespostas: (simuladoId: number) =>
    apiV2.get(`/saeb/respostas/simulado/${simuladoId}`),

  // Resultados
  getMeuResultado: (simuladoId: number) =>
    apiV2.get(`/saeb/resultados/simulado/${simuladoId}`),
  getResultadosTurma: (turmaId: number, simuladoId: number) =>
    apiV2.get(`/saeb/resultados/turma/${turmaId}/simulado/${simuladoId}`),

  // Relatórios
  getRelatorioSimulado: (simuladoId: number, escolaId?: number, turmaId?: number, disciplina?: string) =>
    apiV2.get(`/saeb/relatorios/simulado/${simuladoId}`, {
      params: { 
        ...(escolaId && { escola_id: escolaId }),
        ...(turmaId && { turma_id: turmaId }),
        ...(disciplina && { disciplina: disciplina })
      }
    }),
  getRelatorioDescritores: (simuladoId: number, escolaId?: number, turmaId?: number, disciplina?: string) =>
    apiV2.get(`/saeb/relatorios/descritores/${simuladoId}`, {
      params: { 
        ...(escolaId && { escola_id: escolaId }),
        ...(turmaId && { turma_id: turmaId }),
        ...(disciplina && { disciplina: disciplina })
      }
    }),

  // ============================================
  // TOKEN ACCESS - PROFESSOR
  // ============================================

  // Gerar tokens para uma participação (um token por aluno da turma)
  gerarTokens: (participacaoId: number) =>
    apiV2.post(`/saeb/participacoes/${participacaoId}/gerar-tokens`),

  // Listar todos os tokens de uma participação
  listarTokens: (participacaoId: number) =>
    apiV2.get(`/saeb/participacoes/${participacaoId}/tokens`),

  // ============================================
  // TOKEN ACCESS - ALUNO (PUBLIC ENDPOINT)
  // ============================================

  // Autenticar com token (endpoint público - não requer auth)
  autenticarComToken: (token: string) =>
    axios.post(`${API_BASE_URL}/api/v2/saeb/auth/token`, { token }),

  // ============================================
  // MANUAL ENTRY - PROFESSOR
  // ============================================

  // Lançamento manual de resultado de um aluno
  lancamentoManual: (data: any) =>
    apiV2.post('/saeb/resultados/lancamento-manual', data),

  // Lançamento manual em lote (múltiplos alunos)
  lancamentoManualLote: (data: any) =>
    apiV2.post('/saeb/resultados/lancamento-manual/lote', data),

  // ============================================
  // EXPORT/PRINT - PROFESSOR
  // ============================================

  // Exportar simulado para impressão (todas as questões organizadas)
  exportarSimulado: (simuladoId: number) =>
    apiV2.get(`/saeb/simulados/${simuladoId}/exportar`),

  // ============================================
  // GESTÃO DE QUESTÕES DO SIMULADO - GESTÃO MUNICIPAL
  // ============================================

  // Adicionar uma questão ao simulado
  adicionarQuestaoSimulado: (simuladoId: number, questaoId: number) =>
    apiV2.post(`/saeb/simulados/${simuladoId}/questoes/${questaoId}`),

  // Remover uma questão do simulado
  removerQuestaoSimulado: (simuladoId: number, simuladoQuestaoId: number) =>
    apiV2.delete(`/saeb/simulados/${simuladoId}/questoes/${simuladoQuestaoId}`),

  // Reordenar questões do simulado
  reordenarQuestoesSimulado: (simuladoId: number, ordemQuestoes: number[]) =>
    apiV2.put(`/saeb/simulados/${simuladoId}/questoes/reordenar`, ordemQuestoes),

  // ============================================
  // ANÁLISE PSICOMÉTRICA E DASHBOARD - GESTÃO MUNICIPAL
  // ============================================

  // Análise psicométrica completa de um simulado
  analisePsicometricaSimulado: (simuladoId: number) =>
    apiV2.get(`/saeb/simulados/${simuladoId}/analise-psicometrica`),

  // Dashboard com métricas consolidadas
  dashboardMetricas: (anoLetivo?: number) =>
    apiV2.get('/saeb/dashboard/metricas', { params: { ano_letivo: anoLetivo } }),
};
