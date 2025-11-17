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
  EM_PARTES = 'em_partes',
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
}

export interface Turma {
  id: number;
  nome: string;
  ano_escolar: number;
  ano_letivo: number;
  turno?: string;
  escola_id: number;
  ativo: boolean;
  created_at: string;
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

export interface Diagnostico {
  id: number;
  nome: string;
  descricao?: string;
  ano_letivo: number;
  tipo: string;
  bimestre_referencia?: Bimestre;
  objetivo_avaliacao: string;
  genero_textual: string;
  aplicavel_ano_inicial: number;
  aplicavel_ano_final: number;
  ativo: boolean;
  substituido_por_id?: number;
  created_at: string;
}

export interface DiagnosticoResultado {
  id: number;
  diagnostico_id: number;
  aluno_id: number;
  professor_id: number;
  nivel_evolucao: NivelEvolucao;
  observacoes?: string;
  data_aplicacao: string;
  created_at: string;
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
  created_at: string;
  lida_em?: string;
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
}
