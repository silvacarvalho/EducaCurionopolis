/**
 * TypeScript Type Definitions for EDUCA+ Curionópolis
 */

export enum PerfilUsuario {
  GESTAO_MUNICIPAL = 'gestao_municipal',
  DIRETOR_COORDENADOR = 'diretor_coordenador',
  PROFESSOR = 'professor',
  COMUNIDADE = 'comunidade',
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
}

export interface Disciplina {
  id: number;
  nome: string;
  turma_id: number;
  carga_horaria?: number;
  ativo: boolean;
  created_at: string;
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
