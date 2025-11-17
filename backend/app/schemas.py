"""
Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from .models import (
    PerfilUsuario, NivelDesempenho, NivelEvolucao,
    Bimestre, TipoDiagnostico
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
    diretor_id: Optional[int]
    ativo: bool
    created_at: datetime


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
    formacao: Optional[str] = None
    ativo: Optional[bool] = None


class ProfessorResponse(ProfessorBase):
    id: int
    usuario_id: int
    escola_id: int
    ativo: bool
    created_at: datetime


# ============================================
# TURMA SCHEMAS
# ============================================

class TurmaBase(BaseSchema):
    nome: str = Field(..., min_length=1, max_length=100)
    ano_escolar: int = Field(..., ge=1, le=9)
    ano_letivo: int = Field(..., ge=2020, le=2100)
    turno: Optional[str] = None


class TurmaCreate(TurmaBase):
    escola_id: int


class TurmaUpdate(BaseSchema):
    nome: Optional[str] = None
    turno: Optional[str] = None
    ativo: Optional[bool] = None


class TurmaResponse(TurmaBase):
    id: int
    escola_id: int
    ativo: bool
    created_at: datetime


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
    data_nascimento: Optional[datetime] = None
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


class DiagnosticoCreate(DiagnosticoBase):
    pass


class DiagnosticoUpdate(BaseSchema):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    objetivo_avaliacao: Optional[str] = None
    genero_textual: Optional[str] = None
    ativo: Optional[bool] = None


class DiagnosticoResponse(DiagnosticoBase):
    id: int
    ativo: bool
    substituido_por_id: Optional[int] = None
    created_at: datetime


class DiagnosticoSubstituir(BaseSchema):
    """Replace a diagnostic with a new one"""
    diagnostico_antigo_id: int
    novo_diagnostico: DiagnosticoCreate


# ============================================
# DIAGNÓSTICO RESULTADO SCHEMAS
# ============================================

class DiagnosticoResultadoBase(BaseSchema):
    nivel_evolucao: NivelEvolucao
    observacoes: Optional[str] = None


class DiagnosticoResultadoCreate(DiagnosticoResultadoBase):
    diagnostico_id: int
    aluno_id: int


class DiagnosticoResultadoUpdate(BaseSchema):
    nivel_evolucao: Optional[NivelEvolucao] = None
    observacoes: Optional[str] = None


class DiagnosticoResultadoResponse(DiagnosticoResultadoBase):
    id: int
    diagnostico_id: int
    aluno_id: int
    professor_id: int
    data_aplicacao: datetime
    created_at: datetime


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
# MENSAGEM SCHEMAS
# ============================================

class MensagemBase(BaseSchema):
    assunto: str = Field(..., min_length=1, max_length=300)
    corpo: str = Field(..., min_length=1)


class MensagemCreate(MensagemBase):
    destinatario_id: Optional[int] = None
    broadcast: bool = False


class MensagemResponse(MensagemBase):
    id: int
    remetente_id: int
    destinatario_id: Optional[int]
    lida: bool
    broadcast: bool
    created_at: datetime
    lida_em: Optional[datetime]


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
