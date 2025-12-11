/**
 * TypeScript Type Definitions for EDUCA+ Curionópolis
 */

export enum PerfilUsuario {
  GESTAO_MUNICIPAL = 'gestao_municipal',
  DIRETOR_COORDENADOR = 'diretor_coordenador',
  PROFESSOR = 'professor',
  COMUNIDADE = 'comunidade',
  ALUNO = 'aluno',
}

export enum NivelDesempenho {
  ABAIXO_MEDIA = 'abaixo_media',
  NA_MEDIA = 'na_media',
  ACIMA_MEDIA = 'acima_media',
}

export enum NivelEvolucao {
  NAO = 'nao',
  SIM = 'sim',
  EM_PARTE = 'em_parte',
}

export enum ModalidadeDiagnostico {
  LEITURA = 'leitura',
  ESCRITA = 'escrita',
}

export enum HipoteseEscrita {
  NAO_AVALIADO = 'nao_avaliado',
  PRE_SILABICO = 'pre_silabico',
  SILABICO_SEM_VALOR_SONORO = 'silabico_sem_valor_sonoro',
  SILABICO_COM_VALOR_SONORO = 'silabico_com_valor_sonoro',
  SILABICO_ALFABETICO = 'silabico_alfabetico',
  ALFABETICO = 'alfabetico',
}

export enum TipoDiagnostico {
  INICIAL = 'inicial',
  FINAL_BIMESTRE = 'final_bimestre',
}

export enum Bimestre {
  PRIMEIRO = 1,
  SEGUNDO = 2,
  TERCEIRO = 3,
  QUARTO = 4,
}

export interface Usuario {
  id: number;
  cpf: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface Escola {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  codigo_inep?: string;
  diretor_id?: number;
  ativo: boolean;
  created_at: string;
}

export interface Professor {
  id: number;
  usuario_id: number;
  escola_id: number;
  matricula?: string;
  formacao?: string;
  ativo: boolean;
  created_at: string;
  usuario?: Usuario;
}

export interface Turma {
  id: number;
  nome: string;
  ano_escolar: number;
  ano_letivo: number;
  turno?: string;
  escola_id: number;
  professor_id?: number;
  ativo: boolean;
  created_at: string;
  total_alunos?: number;  // Número de alunos ativos na turma
  disciplinas?: Disciplina[];  // Disciplinas vinculadas à turma
}

export interface Disciplina {
  id: number;
  nome: string;
  carga_horaria?: number;
  ativo: boolean;
  created_at: string;
  turmas_ids?: number[];  // IDs das turmas vinculadas
}

export interface Aluno {
  id: number;
  nome_completo: string;
  data_nascimento?: string;
  cpf?: string;
  matricula: string;
  turma_id: number;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  ativo: boolean;
  created_at: string;
}

export interface AvaliacaoBimestral {
  id: number;
  aluno_id: number;
  disciplina_id: number;
  professor_id: number;
  bimestre: Bimestre;
  ano_letivo: number;
  nivel_desempenho: NivelDesempenho;
  observacoes?: string;
  created_at: string;
}

export interface AvaliacaoAgregada {
  id: number;
  turma_id: number;
  disciplina_id: number;
  bimestre: Bimestre;
  ano_letivo: number;
  qtd_abaixo_media: number;
  qtd_na_media: number;
  qtd_acima_media: number;
  observacoes?: string;
  created_at: string;
}

export interface ItemDiagnostico {
  id: number;
  descricao: string;
  modalidade: ModalidadeDiagnostico;
  anos_aplicaveis: string; // Ex: "1,2,3"
  ativo: boolean;
  created_at: string;
}

export interface ItemDiagnosticoCreate {
  descricao: string;
  modalidade: ModalidadeDiagnostico;
  anos_aplicaveis: string;
}

export interface Diagnostico {
  id: number;
  nome: string;
  descricao?: string;
  ano_letivo: number;
  tipo: TipoDiagnostico;
  bimestre_referencia?: Bimestre;
  objetivo_avaliacao: string;
  genero_textual: string;
  aplicavel_ano_inicial: number;
  aplicavel_ano_final: number;
  data_disponivel?: string;
  data_limite?: string;
  ativo: boolean;
  substituido_por_id?: number;
  created_at: string;
  itens?: ItemDiagnostico[];
}

export interface DiagnosticoCreate {
  nome: string;
  descricao?: string;
  ano_letivo: number;
  tipo: TipoDiagnostico;
  bimestre_referencia?: Bimestre;
  objetivo_avaliacao: string;
  genero_textual: string;
  aplicavel_ano_inicial: number;
  aplicavel_ano_final: number;
  data_disponivel?: string;
  data_limite?: string;
}

export interface AvaliacaoItem {
  item_diagnostico_id: number;
  resposta: NivelEvolucao; // SIM, NAO, EM_PARTE
}

export interface AvaliacaoItemResponse extends AvaliacaoItem {
  id: number;
  created_at: string;
}

export interface DiagnosticoResultado {
  id: number;
  diagnostico_id: number;
  aluno_id: number;
  professor_id: number;
  hipotese_escrita: HipoteseEscrita;
  observacoes?: string;
  data_aplicacao: string;
  created_at: string;
  avaliacoes_itens: AvaliacaoItemResponse[];
}

export interface DiagnosticoResultadoCreate {
  diagnostico_id: number;
  aluno_id: number;
  hipotese_escrita: HipoteseEscrita;
  avaliacoes_itens: AvaliacaoItem[];
  observacoes?: string;
}

export interface EstatisticaEixo {
  eixo: HipoteseEscrita;
  quantidade: number;
  percentual: number;
}

export interface RelatorioDiagnosticoPorEixo {
  diagnostico_id: number;
  diagnostico_nome: string;
  total_alunos_turma: number;
  total_alunos_avaliados: number;
  total_nao_avaliados: number;
  percentual_avaliados: number;
  percentual_nao_avaliados: number;
  estatisticas_por_eixo: EstatisticaEixo[];
}

export interface ProvaSimuladoSAEB {
  id: number;
  nome: string;
  ano_letivo: number;
  ano_escolar_aplicavel: number;
  data_aplicacao_prevista?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

export interface ResultadoSAEB {
  id: number;
  prova_id: number;
  aluno_id: number;
  nota_portugues?: number;
  nota_matematica?: number;
  presente: boolean;
  data_realizacao?: string;
  observacoes?: string;
  created_at: string;
}

export interface Mensagem {
  id: number;
  remetente_id: number;
  destinatario_id?: number;
  assunto: string;
  corpo: string;
  lida: boolean;
  broadcast: boolean;
  prioridade: PrioridadeMensagem;
  mensagem_pai_id?: number;
  created_at: string;
  lida_em?: string;
  remetente?: UsuarioSimples;
  destinatario?: UsuarioSimples;
  respostas?: Mensagem[];
  tem_respostas?: boolean;
}

export enum PrioridadeMensagem {
  BAIXA = 'BAIXA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

export interface UsuarioSimples {
  id: number;
  nome_completo: string;
  email: string;
  perfil: string;
}

export interface Destinatario {
  id: number;
  nome_completo: string;
  email: string;
  perfil: string;
  escola_nome?: string;
}

export interface ContadorMensagens {
  nao_lidas: number;
  total: number;
}

export interface MensagemCreate {
  destinatario_id?: number;
  destinatario_ids?: number[];
  assunto: string;
  corpo: string;
  prioridade?: PrioridadeMensagem;
  mensagem_pai_id?: number;
}

export interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'unread_count' | 'online_users';
  data: any;
}

// Report Types
export interface RelatorioAvaliacaoGeral {
  total_alunos: number;
  abaixo_media: number;
  na_media: number;
  acima_media: number;
  percentual_abaixo: number;
  percentual_na: number;
  percentual_acima: number;
}

export interface RelatorioDiagnosticoGeral {
  total_alunos: number;
  nao: number;
  sim: number;
  em_partes: number;
  percentual_nao: number;
  percentual_sim: number;
  percentual_em_partes: number;
}

export interface RelatorioSAEBGeral {
  total_alunos: number;
  presentes: number;
  ausentes: number;
  media_portugues?: number;
  media_matematica?: number;
}

export interface DrillDownData {
  label: string;
  value: number;
  percentage: number;
  details?: any[];
  // For evaluation drill-down
  abaixo_media?: number;
  na_media?: number;
  acima_media?: number;
  percentual_abaixo?: number;
  percentual_na?: number;
  percentual_acima?: number;
  escola_id?: number;
  turma_id?: number;
  // Transfer indicators
  tem_transferencias?: boolean;
  total_transferidos?: number;
  total_alunos_atuais?: number;
}

// ============================================
// SAEB V2 TYPES
// ============================================

export enum DisciplinaSAEB {
  PORTUGUES = 'portugues',
  MATEMATICA = 'matematica',
}

export enum BlocoSAEB {
  BLOCO_1 = 1,
  BLOCO_2 = 2,
}

export enum SituacaoSAEB {
  ADEQUADO = 'adequado',
  INTERMEDIARIO_I = 'intermediario_i',
  INTERMEDIARIO_II = 'intermediario_ii',
  CRITICO = 'critico',
  MUITO_CRITICO = 'muito_critico',
}

export enum StatusSimulado {
  RASCUNHO = 'rascunho',
  PUBLICADO = 'publicado',
  EM_ANDAMENTO = 'em_andamento',
  ENCERRADO = 'encerrado',
}

export interface DescritorSAEB {
  id: number;
  disciplina: DisciplinaSAEB;
  ano_escolar: number;
  codigo: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

export interface DescritorSAEBCreate {
  disciplina: DisciplinaSAEB;
  ano_escolar: number;
  codigo: string;
  descricao: string;
}

export interface QuestaoSAEB {
  id: number;
  descritor_id: number;
  enunciado: string;
  disciplina: DisciplinaSAEB;
  bloco: BlocoSAEB;
  ano_escolar: number;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  gabarito?: string; // Hidden from students
  ativo: boolean;
  created_at: string;
  descritor?: DescritorSAEB;
}

export interface QuestaoSAEBCreate {
  descritor_id: number;
  enunciado: string;
  disciplina: DisciplinaSAEB;
  bloco: BlocoSAEB;
  ano_escolar: number;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  gabarito: string;
}

export interface ConfiguracaoSAEB {
  id: number;
  ano_escolar: number;
  questoes_por_bloco: number;
  descricao?: string;
  created_at: string;
}

export interface ConfiguracaoSAEBCreate {
  ano_escolar: number;
  questoes_por_bloco: number;
  descricao?: string;
}

export interface ConfiguracaoSAEBUpdate {
  questoes_por_bloco?: number;
  descricao?: string;
}

export interface SimuladoSAEB {
  id: number;
  nome: string;
  descricao?: string;
  ano_escolar: number;
  ano_letivo: number;
  data_disponivel?: string;
  data_limite?: string;
  status: StatusSimulado;
  ativo: boolean;
  created_at: string;
  total_questoes?: number;
}

export interface SimuladoSAEBCreate {
  nome: string;
  descricao?: string;
  ano_escolar: number;
  ano_letivo: number;
  data_disponivel?: string;
  data_limite?: string;
  questoes_ids: number[];
  status?: StatusSimulado;
}

export interface SimuladoQuestao {
  id: number;
  simulado_id: number;
  questao_id: number;
  ordem: number;
  questao?: QuestaoSAEB;
}

export interface ParticipacaoSimulado {
  id: number;
  simulado_id: number;
  turma_id: number;
  professor_id: number;
  liberado: boolean;
  data_liberacao?: string;
  created_at: string;
  simulado?: SimuladoSAEB;
  turma?: Turma;
}

export interface ParticipacaoSimuladoCreate {
  simulado_id: number;
  turma_id: number;
}

export interface RespostaAlunoSAEB {
  id: number;
  simulado_questao_id: number;
  aluno_id: number;
  resposta: string;
  correta: boolean;
  created_at: string;
}

export interface RespostaAlunoSAEBCreate {
  simulado_questao_id: number;
  resposta: string;
}

export interface RespostaAlunoSAEBBulk {
  simulado_id: number;
  respostas: RespostaAlunoSAEBCreate[];
}

export interface ResultadoSimuladoAluno {
  id: number;
  simulado_id: number;
  aluno_id: number;
  total_questoes: number;
  total_acertos: number;
  total_erros: number;
  porcentagem: number;
  situacao: SituacaoSAEB;
  finalizado: boolean;
  created_at: string;
  aluno?: Aluno;
}

export interface RelatorioSimulado {
  simulado_id: number;
  simulado_nome: string;
  total_alunos_participantes: number;
  total_alunos_finalizados: number;
  media_geral: number;
  adequado: number;
  intermediario_i: number;
  intermediario_ii: number;
  critico: number;
  muito_critico: number;
}

export interface RelatorioDescritor {
  descritor_id: number;
  descritor_codigo: string;
  descritor_descricao: string;
  total_questoes: number;
  total_acertos: number;
  total_erros: number;
  porcentagem_acerto: number;
}

// ============================================
// SAEB V2 - TOKEN ACCESS TYPES
// ============================================

export interface TokenAcessoSimulado {
  id: number;
  token: string;
  aluno_id: number;
  aluno_nome: string;
  aluno_matricula: string;
  usado: boolean;
  data_primeiro_acesso?: string;
  data_expiracao: string;
  ativo: boolean;
  created_at: string;
}

export interface TokenAcessoList {
  participacao_id: number;
  simulado_nome: string;
  turma_nome: string;
  total_tokens: number;
  tokens: TokenAcessoSimulado[];
}

export interface TokenAuthRequest {
  token: string;
}

export interface TokenAuthResponse {
  access_token: string;
  token_type: string;
  aluno_id: number;
  aluno_nome: string;
  simulado_id: number;
  simulado_nome: string;
}

// ============================================
// SAEB V2 - MANUAL ENTRY TYPES
// ============================================

export interface RespostaManual {
  simulado_questao_id: number;
  resposta: string;
}

export interface LancamentoManual {
  aluno_id: number;
  simulado_id: number;
  respostas: RespostaManual[];
}

export interface LancamentoManualBulk {
  simulado_id: number;
  turma_id: number;
  lancamentos: LancamentoManual[];
}

export interface LancamentoManualResponse {
  success: boolean;
  resultado_id: number;
  total_questoes: number;
  total_acertos: number;
  porcentagem: number;
  situacao: SituacaoSAEB;
}

export interface LancamentoManualBulkResponse {
  total_lancamentos: number;
  sucesso: number;
  falhas: number;
  resultados: Array<{
    aluno_id: number;
    aluno_nome: string;
    success: boolean;
    error?: string;
    resultado?: LancamentoManualResponse;
  }>;
}

// ============================================
// SAEB V2 - EXPORT TYPES
// ============================================

export interface QuestaoExportada {
  ordem: number;
  id: number;
  enunciado: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  descritor_codigo: string;
  descritor_descricao: string;
}

export interface BlocoExportado {
  bloco: BlocoSAEB;
  questoes: QuestaoExportada[];
}

export interface DisciplinaExportada {
  disciplina: DisciplinaSAEB;
  blocos: BlocoExportado[];
}

export interface SimuladoExportado {
  simulado_id: number;
  simulado_nome: string;
  ano_escolar: number;
  ano_letivo: number;
  total_questoes: number;
  disciplinas: DisciplinaExportada[];
}

// ============================================
// SAEB V2 - ANÁLISE PSICOMÉTRICA TYPES
// ============================================

export interface AnalisePsicometricaQuestao {
  questao_id: number;
  enunciado: string;
  descritor_codigo: string;
  total_respostas: number;
  total_acertos: number;
  indice_dificuldade: number;
  classificacao_dificuldade: string;
  indice_discriminacao: number;
  classificacao_discriminacao: string;
  distribuicao_alternativas: { [key: string]: number };
  alternativa_correta: string;
  distratores_eficazes: string[];
}

export interface AnalisePsicometricaDescritor {
  descritor_id: number;
  descritor_codigo: string;
  descritor_descricao: string;
  total_questoes: number;
  media_dificuldade: number;
  media_discriminacao: number;
  questoes: AnalisePsicometricaQuestao[];
}

export interface AnalisePsicometricaSimulado {
  simulado_id: number;
  simulado_nome: string;
  total_participantes: number;
  total_questoes: number;
  media_geral: number;
  desvio_padrao: number;
  mediana: number;
  nota_minima: number;
  nota_maxima: number;
  alpha_cronbach: number;
  classificacao_alpha: string;
  analise_portugues?: {
    media: number;
    total_questoes: number;
  };
  analise_matematica?: {
    media: number;
    total_questoes: number;
  };
  questoes: AnalisePsicometricaQuestao[];
  descritores: AnalisePsicometricaDescritor[];
  distribuicao_notas: { [key: string]: number };
}

export interface DashboardMetricas {
  periodo: string;
  total_simulados: number;
  total_participacoes: number;
  total_alunos_unicos: number;
  taxa_conclusao: number;
  media_geral_rede: number;
  melhor_escola?: {
    nome: string;
    media: number;
  };
  pior_escola?: {
    nome: string;
    media: number;
  };
  questoes_muito_faceis: number;
  questoes_faceis: number;
  questoes_medias: number;
  questoes_dificeis: number;
  questoes_muito_dificeis: number;
  evolucao_mensal: Array<{
    mes: string;
    media: number;
    total_participacoes: number;
  }>;
  media_por_disciplina?: {
    portugues: number;
    matematica: number;
  };
  top_5_questoes_problematicas?: Array<{
    simulado_id?: number;
    simulado_nome?: string;
    questao_id?: number;
    enunciado?: string;
    indice_dificuldade?: number;
    indice_discriminacao?: number | null;
    distratores_eficazes?: string[];
  }>;
  percentual_questoes_distratores_eficazes?: number;
  alpha_cronbach_rede?: number;
  mapa_descritores?: Array<{
    descritor_codigo: string;
    media_dificuldade: number;
    total_questoes: number;
  }>;
  comparacao_periodos?: {
    ano_anterior_media: number;
    delta_versus_ano_anterior: number;
  };
}
