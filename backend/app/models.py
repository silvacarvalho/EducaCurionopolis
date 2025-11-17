"""
SQLAlchemy Models for EDUCA+ Curionópolis
Complete database schema with all relationships
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Table, Text, Enum as SQLEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from .database import Base


# ============================================
# ENUMS
# ============================================

class PerfilUsuario(str, enum.Enum):
    """User profile types"""
    GESTAO_MUNICIPAL = "gestao_municipal"
    DIRETOR_COORDENADOR = "diretor_coordenador"
    PROFESSOR = "professor"
    COMUNIDADE = "comunidade"


class NivelDesempenho(str, enum.Enum):
    """Student performance levels"""
    ABAIXO_MEDIA = "abaixo_media"
    NA_MEDIA = "na_media"
    ACIMA_MEDIA = "acima_media"


class NivelEvolucao(str, enum.Enum):
    """Student evolution levels for diagnostics"""
    NAO = "nao"
    SIM = "sim"
    EM_PARTES = "em_partes"


class Bimestre(int, enum.Enum):
    """Bimester periods"""
    PRIMEIRO = 1
    SEGUNDO = 2
    TERCEIRO = 3
    QUARTO = 4


class TipoDiagnostico(str, enum.Enum):
    """Diagnostic types"""
    INICIAL = "inicial"  # Início do 1º bimestre
    FINAL_BIMESTRE = "final_bimestre"  # Final de cada bimestre


# ============================================
# ASSOCIATION TABLES (Many-to-Many)
# ============================================

professor_disciplina = Table(
    'professor_disciplina',
    Base.metadata,
    Column('professor_id', Integer, ForeignKey('professores.id', ondelete='CASCADE'), primary_key=True),
    Column('disciplina_id', Integer, ForeignKey('disciplinas.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)


# ============================================
# MAIN MODELS
# ============================================

class Usuario(Base):
    """
    Main user table for authentication and authorization
    Stores all user types with role-based access control
    """
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    cpf = Column(String(14), unique=True, index=True, nullable=False)  # Format: 000.000.000-00
    nome_completo = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    telefone = Column(String(20))
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(SQLEnum(PerfilUsuario), nullable=False)
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    escola_dirigida = relationship("Escola", back_populates="diretor", uselist=False)
    professor = relationship("Professor", back_populates="usuario", uselist=False)
    mensagens_enviadas = relationship("Mensagem", foreign_keys="[Mensagem.remetente_id]", back_populates="remetente")
    mensagens_recebidas = relationship("Mensagem", foreign_keys="[Mensagem.destinatario_id]", back_populates="destinatario")

    def __repr__(self):
        return f"<Usuario(cpf={self.cpf}, nome={self.nome_completo}, perfil={self.perfil})>"


class Escola(Base):
    """
    School entity
    Each school has one director/coordinator
    """
    __tablename__ = "escolas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False, unique=True)
    endereco = Column(String(300))
    telefone = Column(String(20))
    email = Column(String(255))
    codigo_inep = Column(String(20), unique=True)  # INEP code
    diretor_id = Column(Integer, ForeignKey('usuarios.id'))
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    diretor = relationship("Usuario", back_populates="escola_dirigida")
    professores = relationship("Professor", back_populates="escola", cascade="all, delete-orphan")
    turmas = relationship("Turma", back_populates="escola", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Escola(nome={self.nome}, codigo_inep={self.codigo_inep})>"


class Professor(Base):
    """
    Teacher entity
    Linked to a school and user account
    Can teach multiple disciplines
    """
    __tablename__ = "professores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), unique=True, nullable=False)
    escola_id = Column(Integer, ForeignKey('escolas.id'), nullable=False)
    matricula = Column(String(50), unique=True)
    formacao = Column(String(200))  # Academic background
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    usuario = relationship("Usuario", back_populates="professor")
    escola = relationship("Escola", back_populates="professores")
    disciplinas = relationship("Disciplina", secondary=professor_disciplina, back_populates="professores")
    avaliacoes = relationship("AvaliacaoBimestral", back_populates="professor")
    diagnosticos_aplicados = relationship("DiagnosticoResultado", back_populates="professor")

    def __repr__(self):
        return f"<Professor(matricula={self.matricula}, escola_id={self.escola_id})>"


class Turma(Base):
    """
    Class/Grade entity
    Belongs to a school
    """
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)  # Ex: "1º Ano A", "5º Ano B"
    ano_escolar = Column(Integer, nullable=False)  # 1 to 9 (for basic education)
    ano_letivo = Column(Integer, nullable=False)  # Ex: 2024, 2025
    turno = Column(String(20))  # "Matutino", "Vespertino", "Noturno"
    escola_id = Column(Integer, ForeignKey('escolas.id'), nullable=False)
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one class name per school per year
    __table_args__ = (
        UniqueConstraint('nome', 'escola_id', 'ano_letivo', name='uq_turma_escola_ano'),
    )

    # Relationships
    escola = relationship("Escola", back_populates="turmas")
    alunos = relationship("Aluno", back_populates="turma", cascade="all, delete-orphan")
    disciplinas = relationship("Disciplina", back_populates="turma", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Turma(nome={self.nome}, ano_escolar={self.ano_escolar}, ano_letivo={self.ano_letivo})>"


class Disciplina(Base):
    """
    Subject entity
    Each subject belongs to a class and can have multiple teachers
    """
    __tablename__ = "disciplinas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)  # "Matemática", "Português", etc.
    turma_id = Column(Integer, ForeignKey('turmas.id'), nullable=False)
    carga_horaria = Column(Integer)  # Weekly hours
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    turma = relationship("Turma", back_populates="disciplinas")
    professores = relationship("Professor", secondary=professor_disciplina, back_populates="disciplinas")
    avaliacoes = relationship("AvaliacaoBimestral", back_populates="disciplina")

    def __repr__(self):
        return f"<Disciplina(nome={self.nome}, turma_id={self.turma_id})>"


class Aluno(Base):
    """
    Student entity
    Belongs to a class
    """
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, index=True)
    nome_completo = Column(String(200), nullable=False)
    data_nascimento = Column(DateTime)
    cpf = Column(String(14), unique=True, index=True)
    matricula = Column(String(50), unique=True, nullable=False)
    turma_id = Column(Integer, ForeignKey('turmas.id'), nullable=False)
    nome_responsavel = Column(String(200))
    telefone_responsavel = Column(String(20))
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    turma = relationship("Turma", back_populates="alunos")
    avaliacoes = relationship("AvaliacaoBimestral", back_populates="aluno", cascade="all, delete-orphan")
    diagnosticos = relationship("DiagnosticoResultado", back_populates="aluno", cascade="all, delete-orphan")
    resultados_saeb = relationship("ResultadoSAEB", back_populates="aluno", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Aluno(matricula={self.matricula}, nome={self.nome_completo})>"


# ============================================
# MODULE: AVALIAÇÃO
# ============================================

class AvaliacaoBimestral(Base):
    """
    Bimestral evaluation/assessment
    Teacher evaluates each student in each subject per bimester
    """
    __tablename__ = "avaliacoes_bimestrais"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey('alunos.id'), nullable=False)
    disciplina_id = Column(Integer, ForeignKey('disciplinas.id'), nullable=False)
    professor_id = Column(Integer, ForeignKey('professores.id'), nullable=False)
    bimestre = Column(SQLEnum(Bimestre), nullable=False)
    ano_letivo = Column(Integer, nullable=False)
    nivel_desempenho = Column(SQLEnum(NivelDesempenho), nullable=False)
    observacoes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one evaluation per student per subject per bimester per year
    __table_args__ = (
        UniqueConstraint('aluno_id', 'disciplina_id', 'bimestre', 'ano_letivo',
                        name='uq_avaliacao_aluno_disciplina_bimestre'),
    )

    # Relationships
    aluno = relationship("Aluno", back_populates="avaliacoes")
    disciplina = relationship("Disciplina", back_populates="avaliacoes")
    professor = relationship("Professor", back_populates="avaliacoes")

    def __repr__(self):
        return f"<AvaliacaoBimestral(aluno_id={self.aluno_id}, bimestre={self.bimestre}, nivel={self.nivel_desempenho})>"


# ============================================
# MODULE: DIAGNÓSTICO
# ============================================

class Diagnostico(Base):
    """
    Diagnostic template
    Defines what will be evaluated
    5 diagnostics per year: 1 initial + 4 at end of each bimester
    """
    __tablename__ = "diagnosticos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text)
    ano_letivo = Column(Integer, nullable=False)
    tipo = Column(SQLEnum(TipoDiagnostico), nullable=False)
    bimestre_referencia = Column(SQLEnum(Bimestre), nullable=True)  # Null for INICIAL

    # What is being evaluated
    objetivo_avaliacao = Column(Text, nullable=False)  # O que será avaliado
    genero_textual = Column(String(200), nullable=False)  # Gênero textual usado

    # For grades 1-5 only
    aplicavel_ano_inicial = Column(Integer, default=1)
    aplicavel_ano_final = Column(Integer, default=5)

    ativo = Column(Boolean, default=True)
    substituido_por_id = Column(Integer, ForeignKey('diagnosticos.id'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    resultados = relationship("DiagnosticoResultado", back_populates="diagnostico", cascade="all, delete-orphan")
    substituto = relationship("Diagnostico", remote_side=[id], backref="diagnostico_substituido")

    def __repr__(self):
        return f"<Diagnostico(nome={self.nome}, tipo={self.tipo}, ano_letivo={self.ano_letivo})>"


class DiagnosticoResultado(Base):
    """
    Diagnostic result for each student
    Teacher applies diagnostic and classifies evolution
    """
    __tablename__ = "diagnostico_resultados"

    id = Column(Integer, primary_key=True, index=True)
    diagnostico_id = Column(Integer, ForeignKey('diagnosticos.id'), nullable=False)
    aluno_id = Column(Integer, ForeignKey('alunos.id'), nullable=False)
    professor_id = Column(Integer, ForeignKey('professores.id'), nullable=False)
    nivel_evolucao = Column(SQLEnum(NivelEvolucao), nullable=False)
    observacoes = Column(Text)
    data_aplicacao = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one result per student per diagnostic
    __table_args__ = (
        UniqueConstraint('diagnostico_id', 'aluno_id', name='uq_diagnostico_aluno'),
    )

    # Relationships
    diagnostico = relationship("Diagnostico", back_populates="resultados")
    aluno = relationship("Aluno", back_populates="diagnosticos")
    professor = relationship("Professor", back_populates="diagnosticos_aplicados")

    def __repr__(self):
        return f"<DiagnosticoResultado(diagnostico_id={self.diagnostico_id}, aluno_id={self.aluno_id}, nivel={self.nivel_evolucao})>"


# ============================================
# MODULE: SAEB
# ============================================

class ProvaSimuladoSAEB(Base):
    """
    SAEB simulated exam definition
    """
    __tablename__ = "provas_saeb"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    ano_letivo = Column(Integer, nullable=False)
    ano_escolar_aplicavel = Column(Integer, nullable=False)  # 5º ano, 9º ano, etc.
    data_aplicacao_prevista = Column(DateTime)
    descricao = Column(Text)
    ativo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    resultados = relationship("ResultadoSAEB", back_populates="prova", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ProvaSimuladoSAEB(nome={self.nome}, ano_letivo={self.ano_letivo})>"


class ResultadoSAEB(Base):
    """
    SAEB exam result for each student
    """
    __tablename__ = "resultados_saeb"

    id = Column(Integer, primary_key=True, index=True)
    prova_id = Column(Integer, ForeignKey('provas_saeb.id'), nullable=False)
    aluno_id = Column(Integer, ForeignKey('alunos.id'), nullable=False)
    nota_portugues = Column(Integer)  # Score 0-100
    nota_matematica = Column(Integer)  # Score 0-100
    presente = Column(Boolean, default=True)
    data_realizacao = Column(DateTime(timezone=True))
    observacoes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one result per student per exam
    __table_args__ = (
        UniqueConstraint('prova_id', 'aluno_id', name='uq_resultado_saeb_aluno'),
    )

    # Relationships
    prova = relationship("ProvaSimuladoSAEB", back_populates="resultados")
    aluno = relationship("Aluno", back_populates="resultados_saeb")

    def __repr__(self):
        return f"<ResultadoSAEB(prova_id={self.prova_id}, aluno_id={self.aluno_id})>"


# ============================================
# MESSAGING SYSTEM
# ============================================

class Mensagem(Base):
    """
    Internal messaging system
    Municipal management can send to directors
    Directors can send to teachers
    """
    __tablename__ = "mensagens"

    id = Column(Integer, primary_key=True, index=True)
    remetente_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    destinatario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)  # Null for broadcast
    assunto = Column(String(300), nullable=False)
    corpo = Column(Text, nullable=False)
    lida = Column(Boolean, default=False)
    broadcast = Column(Boolean, default=False)  # True if sent to all users of a type

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lida_em = Column(DateTime(timezone=True))

    # Relationships
    remetente = relationship("Usuario", foreign_keys=[remetente_id], back_populates="mensagens_enviadas")
    destinatario = relationship("Usuario", foreign_keys=[destinatario_id], back_populates="mensagens_recebidas")

    def __repr__(self):
        return f"<Mensagem(assunto={self.assunto}, remetente_id={self.remetente_id})>"
