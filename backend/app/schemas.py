"""
Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date
import enum
from .models import (
    PerfilUsuario, NivelDesempenho, NivelEvolucao,
    Bimestre, TipoDiagnostico, ModalidadeDiagnostico, HipoteseEscrita
)


# ============================================
# BASE SCHEMAS
# ============================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================
# USUARIO SCHEMAS
# ============================================

class UsuarioBase(BaseSchema):
    cpf: str = Field(..., min_length=11, max_length=14)
    nome_completo: str = Field(..., min_length=3, max_length=200)
    email: EmailStr
    telefone: Optional[str] = None
    perfil: PerfilUsuario


class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6, max_length=72)


class UsuarioUpdate(BaseSchema):
    nome_completo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    created_at: datetime


class UsuarioLogin(BaseSchema):
    email: EmailStr
    senha: str


class Token(BaseSchema):
    access_token: str
    token_type: str


class TokenData(BaseSchema):
    email: Optional[str] = None
    perfil: Optional[str] = None


# ============================================
# ESCOLA SCHEMAS
# ============================================

class EscolaBase(BaseSchema):
    nome: str = Field(..., min_length=3, max_length=200)
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    codigo_inep: Optional[str] = None


class EscolaCreate(EscolaBase):
    diretor_id: int


class EscolaUpdate(BaseSchema):
    nome: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    diretor_id: Optional[int] = None
    ativo: Optional[bool] = None


class EscolaResponse(EscolaBase):
    id: int
    diretor_id: Optional[int] = None
    ativo: bool = True
    created_at: Optional[datetime] = None


class EscolaImportCSV(BaseSchema):
    """Schema for bulk import via CSV"""
    escolas: List[EscolaCreate]


# ============================================
# PROFESSOR SCHEMAS
# ============================================

class ProfessorBase(BaseSchema):
    matricula: Optional[str] = None
    formacao: Optional[str] = None


class ProfessorCreate(BaseSchema):
    usuario: UsuarioCreate
    escola_id: int
    matricula: Optional[str] = None
    formacao: Optional[str] = None


class ProfessorUpdate(BaseSchema):
    nome_completo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    senha: Optional[str] = Field(None, min_length=6, max_length=72)
    formacao: Optional[str] = None
    ativo: Optional[bool] = None


class ProfessorResponse(ProfessorBase):
    id: int
    usuario_id: int
    escola_id: int
    ativo: bool
    created_at: datetime
    usuario: Optional['UsuarioResponse'] = None
    escola: Optional['EscolaResponse'] = None

    class Config:
        from_attributes = True


# ============================================
# TURMA SCHEMAS
# ============================================

class TurmaBase(BaseSchema):
    nome: str = Field(..., min_length=1, max_length=100)
    ano_escolar: int = Field(..., ge=1, le=9)
    turno: Optional[str] = None


class TurmaCreate(TurmaBase):
    escola_id: int
    professor_id: Optional[int] = None
    ano_letivo: Optional[int] = Field(None, ge=2020, le=2100)  # Auto-filled if not provided


class TurmaUpdate(BaseSchema):
    nome: Optional[str] = None
    turno: Optional[str] = None
    professor_id: Optional[int] = None
    ativo: Optional[bool] = None


class TurmaResponse(TurmaBase):
    id: int
    escola_id: int
    professor_id: Optional[int] = None
    ano_letivo: int
    ativo: bool
    created_at: datetime
    professor: Optional['ProfessorResponse'] = None
    escola: Optional['EscolaResponse'] = None
    total_alunos: int = 0  # Número de alunos ativos na turma

    class Config:
        from_attributes = True


# ============================================
# DISCIPLINA SCHEMAS
# ============================================

class DisciplinaBase(BaseSchema):
    nome: str = Field(..., min_length=2, max_length=100)
    carga_horaria: Optional[int] = None


class DisciplinaCreate(DisciplinaBase):
    turma_id: int


class DisciplinaUpdate(BaseSchema):
    nome: Optional[str] = None
    carga_horaria: Optional[int] = None
    ativo: Optional[bool] = None


class DisciplinaResponse(DisciplinaBase):
    id: int
    turma_id: int
    ativo: bool
    created_at: datetime


class VincularProfessorDisciplina(BaseSchema):
    """Link teacher to subject"""
    professor_id: int
    disciplina_id: int


# ============================================
# ALUNO SCHEMAS
# ============================================

class AlunoBase(BaseSchema):
    nome_completo: str = Field(..., min_length=3, max_length=200)
    data_nascimento: Optional[date] = None
    cpf: Optional[str] = None
    matricula: str = Field(..., min_length=1, max_length=50)
    nome_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None


class AlunoCreate(AlunoBase):
    turma_id: int


class AlunoUpdate(BaseSchema):
    nome_completo: Optional[str] = None
    turma_id: Optional[int] = None
    nome_responsavel: Optional[str] = None
    telefone_responsavel: Optional[str] = None
    ativo: Optional[bool] = None


class AlunoResponse(AlunoBase):
    id: int
    turma_id: int
    ativo: bool
    created_at: datetime
    turma: Optional['TurmaResponse'] = None

    class Config:
        from_attributes = True


# ============================================
# AVALIAÇÃO BIMESTRAL SCHEMAS
# ============================================

class AvaliacaoBimestralBase(BaseSchema):
    bimestre: Bimestre
    ano_letivo: int = Field(..., ge=2020, le=2100)
    nivel_desempenho: NivelDesempenho
    observacoes: Optional[str] = None


class AvaliacaoBimestralCreate(AvaliacaoBimestralBase):
    aluno_id: int
    disciplina_id: int


class AvaliacaoBimestralUpdate(BaseSchema):
    nivel_desempenho: Optional[NivelDesempenho] = None
    observacoes: Optional[str] = None


class AvaliacaoBimestralResponse(AvaliacaoBimestralBase):
    id: int
    aluno_id: int
    disciplina_id: int
    professor_id: int
    created_at: datetime


class AvaliacaoBimestralBulk(BaseSchema):
    """For bulk evaluation creation"""
    avaliacoes: List[AvaliacaoBimestralCreate]




# ============================================
# AVALIAÇÃO AGREGADA SCHEMAS
# ============================================

class AvaliacaoAgregadaBase(BaseSchema):
    bimestre: int = Field(..., ge=1, le=4)
    ano_letivo: int = Field(..., ge=2020, le=2100)
    qtd_abaixo_media: int = Field(default=0, ge=0)
    qtd_na_media: int = Field(default=0, ge=0)
    qtd_acima_media: int = Field(default=0, ge=0)
    observacoes: Optional[str] = None


class AvaliacaoAgregadaCreate(AvaliacaoAgregadaBase):
    turma_id: int
    disciplina_id: int


class AvaliacaoAgregadaUpdate(BaseSchema):
    qtd_abaixo_media: Optional[int] = Field(None, ge=0)
    qtd_na_media: Optional[int] = Field(None, ge=0)
    qtd_acima_media: Optional[int] = Field(None, ge=0)
    observacoes: Optional[str] = None


class AvaliacaoAgregadaResponse(AvaliacaoAgregadaBase):
    id: int
    turma_id: int
    disciplina_id: int
    created_at: datetime


# ============================================
# ITEM DIAGNÓSTICO SCHEMAS
# ============================================

class ItemDiagnosticoBase(BaseSchema):
    descricao: str = Field(..., min_length=5)
    modalidade: ModalidadeDiagnostico
    anos_aplicaveis: str = Field(..., pattern=r"^[1-5](,[1-5])*$")  # Ex: "1,2,3"

    @validator('anos_aplicaveis')
    def validate_anos(cls, v):
        anos = [int(a) for a in v.split(',')]
        if not all(1 <= ano <= 5 for ano in anos):
            raise ValueError('Anos devem estar entre 1 e 5')
        if len(anos) != len(set(anos)):
            raise ValueError('Anos duplicados não são permitidos')
        return ','.join(map(str, sorted(anos)))


class ItemDiagnosticoCreate(ItemDiagnosticoBase):
    pass


class ItemDiagnosticoUpdate(BaseSchema):
    descricao: Optional[str] = None
    modalidade: Optional[ModalidadeDiagnostico] = None
    anos_aplicaveis: Optional[str] = None
    ativo: Optional[bool] = None


class ItemDiagnosticoResponse(ItemDiagnosticoBase):
    id: int
    ativo: bool
    created_at: datetime

    @property
    def anos_lista(self) -> List[int]:
        """Retorna lista de anos aplicáveis"""
        return [int(a) for a in self.anos_aplicaveis.split(',')]


# ============================================
# DIAGNÓSTICO SCHEMAS
# ============================================

class DiagnosticoBase(BaseSchema):
    nome: str = Field(..., min_length=3, max_length=200)
    descricao: Optional[str] = None
    ano_letivo: int = Field(..., ge=2020, le=2100)
    tipo: TipoDiagnostico
    bimestre_referencia: Optional[Bimestre] = None
    objetivo_avaliacao: str
    genero_textual: str = Field(..., min_length=2, max_length=200)
    aplicavel_ano_inicial: int = Field(default=1, ge=1, le=5)
    aplicavel_ano_final: int = Field(default=5, ge=1, le=5)
    data_disponivel: Optional[datetime] = None
    data_limite: Optional[datetime] = None


class DiagnosticoCreate(DiagnosticoBase):
    pass


class DiagnosticoUpdate(BaseSchema):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    objetivo_avaliacao: Optional[str] = None
    genero_textual: Optional[str] = None
    data_disponivel: Optional[datetime] = None
    data_limite: Optional[datetime] = None
    ativo: Optional[bool] = None


class DiagnosticoResponse(DiagnosticoBase):
    id: int
    ativo: bool
    substituido_por_id: Optional[int] = None
    created_at: datetime
    itens: List[ItemDiagnosticoResponse] = []


class DiagnosticoSubstituir(BaseSchema):
    """Replace a diagnostic with a new one"""
    diagnostico_antigo_id: int
    novo_diagnostico: DiagnosticoCreate


class DiagnosticoVincularItens(BaseSchema):
    """Vincular itens a um diagnóstico"""
    item_ids: List[int]


# ============================================
# AVALIAÇÃO ITEM DIAGNÓSTICO SCHEMAS
# ============================================

class AvaliacaoItemBase(BaseSchema):
    item_diagnostico_id: int
    resposta: NivelEvolucao  # SIM, NAO, EM_PARTE


class AvaliacaoItemCreate(AvaliacaoItemBase):
    pass


class AvaliacaoItemResponse(AvaliacaoItemBase):
    id: int
    created_at: datetime


# ============================================
# DIAGNÓSTICO RESULTADO SCHEMAS
# ============================================

class DiagnosticoResultadoBase(BaseSchema):
    hipotese_escrita: HipoteseEscrita
    observacoes: Optional[str] = None


class DiagnosticoResultadoCreate(DiagnosticoResultadoBase):
    """Criar resultado com hipótese de escrita e avaliações de itens"""
    diagnostico_id: int
    aluno_id: int
    avaliacoes_itens: List[AvaliacaoItemCreate]

    @validator('avaliacoes_itens')
    def validate_avaliacoes(cls, v):
        if not v or len(v) == 0:
            raise ValueError('É obrigatório avaliar pelo menos um item')
        return v


class DiagnosticoResultadoUpdate(BaseSchema):
    hipotese_escrita: Optional[HipoteseEscrita] = None
    observacoes: Optional[str] = None
    avaliacoes_itens: Optional[List[AvaliacaoItemCreate]] = None


class DiagnosticoResultadoResponse(DiagnosticoResultadoBase):
    id: int
    diagnostico_id: int
    aluno_id: int
    professor_id: int
    data_aplicacao: datetime
    created_at: datetime
    avaliacoes_itens: List[AvaliacaoItemResponse] = []


class DiagnosticoResultadoBulk(BaseSchema):
    """For bulk diagnostic results"""
    resultados: List[DiagnosticoResultadoCreate]


# ============================================
# SAEB SCHEMAS
# ============================================

class ProvaSimuladoSAEBBase(BaseSchema):
    nome: str = Field(..., min_length=3, max_length=200)
    ano_letivo: int = Field(..., ge=2020, le=2100)
    ano_escolar_aplicavel: int = Field(..., ge=1, le=9)
    data_aplicacao_prevista: Optional[datetime] = None
    descricao: Optional[str] = None


class ProvaSimuladoSAEBCreate(ProvaSimuladoSAEBBase):
    pass


class ProvaSimuladoSAEBUpdate(BaseSchema):
    nome: Optional[str] = None
    data_aplicacao_prevista: Optional[datetime] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class ProvaSimuladoSAEBResponse(ProvaSimuladoSAEBBase):
    id: int
    ativo: bool
    created_at: datetime


class ResultadoSAEBBase(BaseSchema):
    nota_portugues: Optional[int] = Field(None, ge=0, le=100)
    nota_matematica: Optional[int] = Field(None, ge=0, le=100)
    presente: bool = True
    observacoes: Optional[str] = None


class ResultadoSAEBCreate(ResultadoSAEBBase):
    prova_id: int
    aluno_id: int


class ResultadoSAEBUpdate(BaseSchema):
    nota_portugues: Optional[int] = Field(None, ge=0, le=100)
    nota_matematica: Optional[int] = Field(None, ge=0, le=100)
    presente: Optional[bool] = None
    observacoes: Optional[str] = None


class ResultadoSAEBResponse(ResultadoSAEBBase):
    id: int
    prova_id: int
    aluno_id: int
    data_realizacao: Optional[datetime]
    created_at: datetime


class ResultadoSAEBBulk(BaseSchema):
    """For bulk SAEB results"""
    resultados: List[ResultadoSAEBCreate]


# ============================================
# NEW SAEB SCHEMAS (Complete System)
# ============================================

class DisciplinaSAEB(str, enum.Enum):
    """SAEB disciplines"""
    PORTUGUES = "portugues"
    MATEMATICA = "matematica"


class BlocoSAEB(int, enum.Enum):
    """SAEB blocks"""
    BLOCO_1 = 1
    BLOCO_2 = 2


class SituacaoSAEB(str, enum.Enum):
    """Student performance levels"""
    ADEQUADO = "adequado"
    INTERMEDIARIO_I = "intermediario_i"
    INTERMEDIARIO_II = "intermediario_ii"
    CRITICO = "critico"
    MUITO_CRITICO = "muito_critico"


class StatusSimulado(str, enum.Enum):
    """Simulado status"""
    RASCUNHO = "rascunho"
    PUBLICADO = "publicado"
    EM_ANDAMENTO = "em_andamento"
    ENCERRADO = "encerrado"


# Descritor Schemas
class DescritorSAEBBase(BaseSchema):
    disciplina: DisciplinaSAEB
    ano_escolar: int = Field(..., ge=5, le=9, description="Ano escolar (5 ou 9)")
    codigo: str = Field(..., min_length=1, max_length=20)
    descricao: str = Field(..., min_length=1)


class DescritorSAEBCreate(DescritorSAEBBase):
    pass


class DescritorSAEBUpdate(BaseSchema):
    disciplina: Optional[DisciplinaSAEB] = None
    ano_escolar: Optional[int] = Field(None, ge=5, le=9)
    codigo: Optional[str] = Field(None, min_length=1, max_length=20)
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class DescritorSAEBResponse(DescritorSAEBBase):
    id: int
    ativo: bool
    created_at: datetime


class DescritorSAEBBulkImport(BaseSchema):
    descritores: List[DescritorSAEBCreate]


class DescritorSAEBBulkImportResponse(BaseSchema):
    total: int
    sucesso: int
    falha: int
    duplicados: int = 0
    erros: List[str]


# Questao Schemas
class QuestaoSAEBBase(BaseSchema):
    descritor_id: int
    enunciado: str = Field(..., min_length=1)
    disciplina: DisciplinaSAEB
    bloco: BlocoSAEB
    ano_escolar: int = Field(..., ge=5, le=9)
    alternativa_a: str = Field(..., min_length=1)
    alternativa_b: str = Field(..., min_length=1)
    alternativa_c: str = Field(..., min_length=1)
    alternativa_d: str = Field(..., min_length=1)
    alternativa_e: str = Field(..., min_length=1)
    gabarito: str = Field(..., pattern="^[A-E]$")


class QuestaoSAEBCreate(QuestaoSAEBBase):
    pass


class QuestaoSAEBUpdate(BaseSchema):
    descritor_id: Optional[int] = None
    enunciado: Optional[str] = None
    disciplina: Optional[DisciplinaSAEB] = None
    bloco: Optional[BlocoSAEB] = None
    ano_escolar: Optional[int] = Field(None, ge=5, le=9)
    alternativa_a: Optional[str] = None
    alternativa_b: Optional[str] = None
    alternativa_c: Optional[str] = None
    alternativa_d: Optional[str] = None
    alternativa_e: Optional[str] = None
    gabarito: Optional[str] = Field(None, pattern="^[A-E]$")
    ativo: Optional[bool] = None


class QuestaoSAEBResponse(QuestaoSAEBBase):
    id: int
    ativo: bool
    created_at: datetime


class QuestaoSAEBComDescritor(QuestaoSAEBResponse):
    descritor: DescritorSAEBResponse


# Configuracao SAEB Schemas
class ConfiguracaoSAEBBase(BaseSchema):
    ano_escolar: int = Field(..., ge=5, le=9)
    questoes_por_bloco: int = Field(..., ge=1, le=50)
    descricao: Optional[str] = None


class ConfiguracaoSAEBCreate(ConfiguracaoSAEBBase):
    pass


class ConfiguracaoSAEBUpdate(BaseSchema):
    questoes_por_bloco: Optional[int] = Field(None, ge=1, le=50)
    descricao: Optional[str] = None


class ConfiguracaoSAEBResponse(ConfiguracaoSAEBBase):
    id: int
    created_at: datetime


# Simulado Schemas
class SimuladoSAEBBase(BaseSchema):
    nome: str = Field(..., min_length=3, max_length=200)
    descricao: Optional[str] = None
    ano_escolar: int = Field(..., ge=5, le=9)
    ano_letivo: int = Field(..., ge=2020, le=2100)
    data_disponivel: Optional[datetime] = None
    data_limite: Optional[datetime] = None


class SimuladoSAEBCreate(SimuladoSAEBBase):
    questoes_ids: List[int] = []  # List of question IDs to include


class SimuladoSAEBUpdate(BaseSchema):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusSimulado] = None
    data_disponivel: Optional[datetime] = None
    data_limite: Optional[datetime] = None
    questoes_ids: Optional[List[int]] = None
    ativo: Optional[bool] = None


class SimuladoSAEBResponse(SimuladoSAEBBase):
    id: int
    status: StatusSimulado
    ativo: bool
    created_at: datetime
    total_questoes: Optional[int] = 0


class SimuladoSAEBDetalhado(SimuladoSAEBResponse):
    questoes: List[QuestaoSAEBComDescritor]


# Participacao Schemas
class ParticipacaoSimuladoCreate(BaseSchema):
    simulado_id: int
    turma_id: int


class ParticipacaoSimuladoResponse(BaseSchema):
    id: int
    simulado_id: int
    turma_id: int
    professor_id: int
    liberado: bool
    data_liberacao: Optional[datetime]
    created_at: datetime


# Resposta Aluno Schemas
class RespostaAlunoSAEBCreate(BaseSchema):
    simulado_questao_id: int
    resposta: str = Field(..., pattern="^[A-E]$")


class RespostaAlunoSAEBBulk(BaseSchema):
    simulado_id: int
    respostas: List[RespostaAlunoSAEBCreate]


class RespostaAlunoSAEBResponse(BaseSchema):
    id: int
    simulado_questao_id: int
    aluno_id: int
    resposta: str
    correta: bool
    created_at: datetime


# Resultado Simulado Schemas
class ResultadoSimuladoAlunoResponse(BaseSchema):
    id: int
    simulado_id: int
    aluno_id: int
    total_questoes: int
    total_acertos: int
    total_erros: int
    porcentagem: int
    situacao: SituacaoSAEB
    finalizado: bool
    data_finalizacao: Optional[datetime]
    created_at: datetime


class ResultadoSimuladoDetalhado(ResultadoSimuladoAlunoResponse):
    aluno_nome: str
    simulado_nome: str
    disciplina: DisciplinaSAEB
    respostas: List[RespostaAlunoSAEBResponse]


# Relatorios SAEB
class RelatorioDescritor(BaseSchema):
    """Performance report by descriptor"""
    descritor_id: int
    descritor_codigo: str
    descritor_descricao: str
    total_questoes: int
    total_acertos: int
    total_erros: int
    porcentagem_acerto: float


class RelatorioSimulado(BaseSchema):
    """General simulado report"""
    simulado_id: int
    simulado_nome: str
    total_alunos_participantes: int
    total_alunos_finalizados: int
    media_geral: float
    adequado: int
    intermediario_i: int
    intermediario_ii: int
    critico: int
    muito_critico: int


# ============================================
# TOKEN ACESSO SCHEMAS
# ============================================

class TokenAcessoResponse(BaseSchema):
    """Token de acesso para aluno"""
    id: int
    token: str
    aluno_id: int
    aluno_nome: str
    aluno_matricula: str
    usado: bool
    data_primeiro_acesso: Optional[datetime]
    data_expiracao: datetime
    ativo: bool
    created_at: datetime


class TokenAcessoListResponse(BaseSchema):
    """Lista de tokens gerados para uma turma"""
    participacao_id: int
    simulado_nome: str
    turma_nome: str
    tokens: List[TokenAcessoResponse]


class TokenAuthRequest(BaseSchema):
    """Request para autenticação via token"""
    token: str = Field(..., min_length=6, max_length=6)


class TokenAuthResponse(BaseSchema):
    """Response da autenticação via token"""
    access_token: str
    token_type: str
    aluno_id: int
    aluno_nome: str
    simulado_id: int
    simulado_nome: str


# Lançamento Manual de Resultados
class RespostaManualCreate(BaseSchema):
    """Resposta individual para lançamento manual"""
    simulado_questao_id: int
    resposta: str = Field(..., pattern="^[A-E]$")  # A, B, C, D ou E


class LancamentoManualCreate(BaseSchema):
    """Lançamento manual de resultados de um aluno"""
    aluno_id: int
    simulado_id: int
    respostas: List[RespostaManualCreate]


class LancamentoManualBulkCreate(BaseSchema):
    """Lançamento manual em lote (múltiplos alunos)"""
    simulado_id: int
    turma_id: int
    lancamentos: List[LancamentoManualCreate]


# ============================================
# MENSAGEM SCHEMAS
# ============================================

class PrioridadeMensagem(str, enum.Enum):
    """Message priority levels"""
    BAIXA = "BAIXA"
    NORMAL = "NORMAL"
    ALTA = "ALTA"
    URGENTE = "URGENTE"


class MensagemBase(BaseSchema):
    assunto: str = Field(..., min_length=1, max_length=300)
    corpo: str = Field(..., min_length=1)


class MensagemCreate(MensagemBase):
    destinatario_id: Optional[int] = None
    destinatario_ids: Optional[List[int]] = None  # For multiple recipients
    broadcast: bool = False
    prioridade: PrioridadeMensagem = PrioridadeMensagem.NORMAL
    mensagem_pai_id: Optional[int] = None  # For replies/threads


class UsuarioSimples(BaseSchema):
    """Simplified user info for messages"""
    id: int
    nome_completo: str
    email: str
    perfil: str


class MensagemResponse(MensagemBase):
    id: int
    remetente_id: int
    destinatario_id: Optional[int]
    lida: bool
    broadcast: bool
    prioridade: PrioridadeMensagem
    mensagem_pai_id: Optional[int] = None
    created_at: datetime
    lida_em: Optional[datetime]
    remetente: Optional[UsuarioSimples] = None
    destinatario: Optional[UsuarioSimples] = None
    tem_respostas: bool = False


class MensagemComRespostas(MensagemResponse):
    """Message with thread replies"""
    respostas: List['MensagemResponse'] = []


class DestinatarioResponse(BaseSchema):
    """Available recipient for messaging"""
    id: int
    nome_completo: str
    email: str
    perfil: str
    escola_nome: Optional[str] = None


class ContadorMensagens(BaseSchema):
    """Unread messages counter"""
    nao_lidas: int
    total: int


# ============================================
# PASSWORD RESET SCHEMAS
# ============================================

class PasswordReset(BaseSchema):
    usuario_id: int


class PasswordResetBulk(BaseSchema):
    """For bulk password reset"""
    usuario_ids: List[int]


class PasswordChange(BaseSchema):
    senha_atual: str
    senha_nova: str = Field(..., min_length=6, max_length=72)


# ============================================
# RELATORIO SCHEMAS
# ============================================

class FiltroRelatorio(BaseSchema):
    """Common filters for reports"""
    escola_id: Optional[int] = None
    turma_id: Optional[int] = None
    disciplina_id: Optional[int] = None
    ano_letivo: Optional[int] = None
    bimestre: Optional[Bimestre] = None


class RelatorioAvaliacaoGeral(BaseSchema):
    """General evaluation report response"""
    total_alunos: int
    abaixo_media: int
    na_media: int
    acima_media: int
    percentual_abaixo: float
    percentual_na: float
    percentual_acima: float


class RelatorioDiagnosticoGeral(BaseSchema):
    """General diagnostic report response"""
    total_alunos: int
    nao: int
    sim: int
    em_partes: int
    percentual_nao: float
    percentual_sim: float
    percentual_em_partes: float


class EstatisticaEixo(BaseSchema):
    """Estatística por hipótese de escrita (eixo)"""
    eixo: HipoteseEscrita
    quantidade: int
    percentual: float


class RelatorioDiagnosticoPorEixo(BaseSchema):
    """Relatório de diagnóstico agrupado por hipótese de escrita"""
    diagnostico_id: int
    diagnostico_nome: str
    total_alunos_turma: int
    total_alunos_avaliados: int
    total_nao_avaliados: int
    percentual_avaliados: float
    percentual_nao_avaliados: float
    estatisticas_por_eixo: List[EstatisticaEixo]


class RelatorioSAEBGeral(BaseSchema):
    """General SAEB report response"""
    total_alunos: int
    presentes: int
    ausentes: int
    media_portugues: Optional[float]
    media_matematica: Optional[float]


class DrillDownData(BaseSchema):
    """Data for drill-down charts"""
    label: str
    value: int
    percentage: float
    details: Optional[List[dict]] = None


# ============================================
# AVALIAÇÃO AGREGADA SCHEMAS
# ============================================

class AvaliacaoAgregadaBase(BaseSchema):
    bimestre: int = Field(..., ge=1, le=4)
    ano_letivo: int = Field(..., ge=2020, le=2100)
    qtd_abaixo_media: int = Field(default=0, ge=0)
    qtd_na_media: int = Field(default=0, ge=0)
    qtd_acima_media: int = Field(default=0, ge=0)
    observacoes: Optional[str] = None


class AvaliacaoAgregadaCreate(AvaliacaoAgregadaBase):
    turma_id: int
    disciplina_id: int


class AvaliacaoAgregadaUpdate(BaseSchema):
    qtd_abaixo_media: Optional[int] = Field(None, ge=0)
    qtd_na_media: Optional[int] = Field(None, ge=0)
    qtd_acima_media: Optional[int] = Field(None, ge=0)
    observacoes: Optional[str] = None


class AvaliacaoAgregadaResponse(AvaliacaoAgregadaBase):
    id: int
    turma_id: int
    disciplina_id: int
    created_at: datetime



# ============================================
# CHART CONFIGURATION SCHEMAS
# ============================================

class ConfiguracaoGraficoBase(BaseSchema):
    bar_width: int = Field(40, ge=20, le=100, description="Width of bars in pixels")
    chart_height: int = Field(400, ge=300, le=800, description="Height of chart in pixels")
    colors: List[str] = Field(
        default=["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
        description="List of hex color codes"
    )
    default_chart_type: str = Field("bar", pattern="^(bar|pie)$", description="Default chart type")

    @validator('colors')
    def validate_colors(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one color is required')
        for color in v:
            if not color.startswith('#') or len(color) not in [4, 7]:
                raise ValueError(f'Invalid hex color: {color}')
        return v


class ConfiguracaoGraficoCreate(ConfiguracaoGraficoBase):
    pass


class ConfiguracaoGraficoUpdate(BaseSchema):
    bar_width: Optional[int] = Field(None, ge=20, le=100)
    chart_height: Optional[int] = Field(None, ge=300, le=800)
    colors: Optional[List[str]] = None
    default_chart_type: Optional[str] = Field(None, pattern="^(bar|pie)$")

    @validator('colors')
    def validate_colors(cls, v):
        if v is not None:
            if len(v) == 0:
                raise ValueError('At least one color is required')
            for color in v:
                if not color.startswith('#') or len(color) not in [4, 7]:
                    raise ValueError(f'Invalid hex color: {color}')
        return v


class ConfiguracaoGraficoResponse(ConfiguracaoGraficoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None


# ============================================
# SAEB V2 - ANÁLISE PSICOMÉTRICA SCHEMAS
# ============================================

class AnalisePsicometricaQuestao(BaseSchema):
    """Análise psicométrica de uma questão"""
    questao_id: int
    enunciado: str
    descritor_codigo: str

    # Índice de Dificuldade (ID)
    total_respostas: int
    total_acertos: int
    indice_dificuldade: float  # Percentual de acertos (0-100)
    classificacao_dificuldade: str  # Muito fácil, Fácil, Médio, Difícil, Muito difícil

    # Índice de Discriminação (ID)
    indice_discriminacao: float  # -1.0 a 1.0
    classificacao_discriminacao: str  # Excelente, Bom, Regular, Fraco, Muito fraco

    # Análise de Distratores
    distribuicao_alternativas: dict  # {A: 10, B: 5, C: 15, D: 2, E: 8}
    alternativa_correta: str
    distratores_eficazes: List[str]  # Distratores que atraíram pelo menos 5% das respostas


class AnalisePsicometricaDescritor(BaseSchema):
    """Análise psicométrica agregada por descritor"""
    descritor_id: int
    descritor_codigo: str
    descritor_descricao: str
    total_questoes: int
    media_dificuldade: float
    media_discriminacao: float
    questoes: List[AnalisePsicometricaQuestao]


class AnalisePsicometricaSimulado(BaseSchema):
    """Análise psicométrica completa do simulado"""
    simulado_id: int
    simulado_nome: str
    total_participantes: int
    total_questoes: int

    # Estatísticas gerais
    media_geral: float  # Média de acertos (%)
    desvio_padrao: float
    mediana: float
    nota_minima: float
    nota_maxima: float

    # Índices de confiabilidade
    alpha_cronbach: Optional[float] = None  # Índice de consistência interna

    # Análise por disciplina
    analise_portugues: Optional[dict] = None
    analise_matematica: Optional[dict] = None

    # Análise detalhada por questão
    questoes: List[AnalisePsicometricaQuestao]

    # Análise por descritor
    descritores: List[AnalisePsicometricaDescritor]

    # Distribuição de notas
    distribuicao_notas: dict  # Histograma de notas


class MetricasDesempenhoTurma(BaseSchema):
    """Métricas de desempenho de uma turma"""
    turma_id: int
    turma_nome: str
    total_alunos: int
    alunos_participantes: int
    taxa_participacao: float

    # Desempenho geral
    media_turma: float
    mediana_turma: float
    desvio_padrao_turma: float

    # Distribuição por situação
    adequado: int
    intermediario_i: int
    intermediario_ii: int
    critico: int
    muito_critico: int

    # Percentuais
    percentual_adequado: float
    percentual_intermediario: float
    percentual_critico: float


class ComparativoDesempenho(BaseSchema):
    """Comparativo de desempenho entre turmas/escolas"""
    simulado_id: int
    simulado_nome: str
    entidades: List[MetricasDesempenhoTurma]

    # Ranking
    melhor_desempenho: str
    pior_desempenho: str

    # Estatísticas comparativas
    media_geral: float
    amplitude: float  # Diferença entre melhor e pior


class TendenciaDesempenhoAluno(BaseSchema):
    """Tendência de desempenho de um aluno ao longo do tempo"""
    aluno_id: int
    aluno_nome: str
    simulados: List[dict]  # [{simulado_nome, nota, data, situacao}]
    media_geral: float
    tendencia: str  # Crescente, Estável, Decrescente
    melhor_desempenho: dict
    pior_desempenho: dict


class AnaliseDescritores(BaseSchema):
    """Análise de domínio de descritores/habilidades"""
    descritor_id: int
    descritor_codigo: str
    descritor_descricao: str
    disciplina: str

    # Desempenho
    total_alunos: int
    alunos_dominaram: int  # >= 75% de acertos
    alunos_parcial: int     # 50-74% de acertos
    alunos_nao_dominaram: int  # < 50% de acertos

    # Percentuais
    percentual_dominio: float
    percentual_parcial: float
    percentual_nao_dominio: float

    # Média de acertos
    media_acertos: float


class DashboardMetricas(BaseSchema):
    """Dashboard com métricas consolidadas"""
    periodo: str

    # Visão geral
    total_simulados: int
    total_participacoes: int
    total_alunos_unicos: int
    taxa_conclusao: float

    # Desempenho médio
    media_geral_rede: float
    melhor_escola: Optional[dict] = None
    pior_escola: Optional[dict] = None

    # Análise de dificuldade
    questoes_muito_faceis: int
    questoes_faceis: int
    questoes_medias: int
    questoes_dificeis: int
    questoes_muito_dificeis: int

    # Tendências
    evolucao_mensal: List[dict]  # [{mes, media, total_participacoes}]

