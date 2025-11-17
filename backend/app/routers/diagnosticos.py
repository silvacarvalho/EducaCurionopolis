"""
Diagnóstico Module Router
Diagnostic assessment for grades 1-5
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import (
    Diagnostico, DiagnosticoResultado, Aluno, Professor,
    Usuario, PerfilUsuario, TipoDiagnostico
)
from ..schemas import (
    DiagnosticoCreate, DiagnosticoUpdate, DiagnosticoResponse,
    DiagnosticoSubstituir,
    DiagnosticoResultadoCreate, DiagnosticoResultadoUpdate,
    DiagnosticoResultadoResponse, DiagnosticoResultadoBulk
)
from ..auth import get_current_active_user, require_gestao_municipal, require_diretor_or_gestao
from ..dependencies import get_current_professor

router = APIRouter()


# ============================================
# DIAGNOSTICO TEMPLATE MANAGEMENT
# ============================================

@router.post("/", response_model=DiagnosticoResponse, status_code=status.HTTP_201_CREATED)
async def create_diagnostico(
    diagnostico_data: DiagnosticoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Create a diagnostic template (GESTÃO MUNICIPAL only)
    """
    db_diagnostico = Diagnostico(**diagnostico_data.dict())
    db.add(db_diagnostico)
    db.commit()
    db.refresh(db_diagnostico)

    return db_diagnostico


@router.post("/substituir")
async def substituir_diagnostico(
    substituicao_data: DiagnosticoSubstituir,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Replace a diagnostic with a new one
    Marks the old one as replaced and requires new application
    """
    # Verify old diagnostic exists
    diagnostico_antigo = db.query(Diagnostico).filter(
        Diagnostico.id == substituicao_data.diagnostico_antigo_id
    ).first()

    if not diagnostico_antigo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico antigo não encontrado"
        )

    # Create new diagnostic
    novo_diagnostico_data = substituicao_data.novo_diagnostico
    db_novo_diagnostico = Diagnostico(**novo_diagnostico_data.dict())
    db.add(db_novo_diagnostico)
    db.flush()

    # Mark old diagnostic as replaced
    diagnostico_antigo.ativo = False
    diagnostico_antigo.substituido_por_id = db_novo_diagnostico.id

    db.commit()
    db.refresh(db_novo_diagnostico)

    return {
        "message": "Diagnóstico substituído com sucesso. Aplicação do novo diagnóstico é obrigatória.",
        "diagnostico_antigo_id": diagnostico_antigo.id,
        "novo_diagnostico_id": db_novo_diagnostico.id,
        "novo_diagnostico": db_novo_diagnostico
    }


@router.get("/", response_model=List[DiagnosticoResponse])
async def list_diagnosticos(
    ano_letivo: int = None,
    tipo: TipoDiagnostico = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List diagnostic templates"""
    query = db.query(Diagnostico)

    if ano_letivo:
        query = query.filter(Diagnostico.ano_letivo == ano_letivo)
    if tipo:
        query = query.filter(Diagnostico.tipo == tipo)
    if ativo is not None:
        query = query.filter(Diagnostico.ativo == ativo)

    diagnosticos = query.offset(skip).limit(limit).all()
    return diagnosticos


@router.get("/{diagnostico_id}", response_model=DiagnosticoResponse)
async def get_diagnostico(
    diagnostico_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get diagnostic template by ID"""
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    return diagnostico


@router.put("/{diagnostico_id}", response_model=DiagnosticoResponse)
async def update_diagnostico(
    diagnostico_id: int,
    diagnostico_data: DiagnosticoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update diagnostic template"""
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    # Update fields
    if diagnostico_data.nome:
        diagnostico.nome = diagnostico_data.nome
    if diagnostico_data.descricao is not None:
        diagnostico.descricao = diagnostico_data.descricao
    if diagnostico_data.objetivo_avaliacao:
        diagnostico.objetivo_avaliacao = diagnostico_data.objetivo_avaliacao
    if diagnostico_data.genero_textual:
        diagnostico.genero_textual = diagnostico_data.genero_textual
    if diagnostico_data.ativo is not None:
        diagnostico.ativo = diagnostico_data.ativo

    db.commit()
    db.refresh(diagnostico)

    return diagnostico


# ============================================
# DIAGNOSTICO RESULTS (APPLICATION)
# ============================================

@router.post("/resultados", response_model=DiagnosticoResultadoResponse, status_code=status.HTTP_201_CREATED)
async def create_resultado_diagnostico(
    resultado_data: DiagnosticoResultadoCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Apply diagnostic to a student (PROFESSOR only)
    """
    # Verify diagnostic exists and is active
    diagnostico = db.query(Diagnostico).filter(
        Diagnostico.id == resultado_data.diagnostico_id,
        Diagnostico.ativo == True
    ).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado ou inativo"
        )

    # Verify aluno exists and is in grades 1-5
    aluno = db.query(Aluno).filter(Aluno.id == resultado_data.aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Verify aluno is in applicable grade range
    if aluno.turma.ano_escolar < diagnostico.aplicavel_ano_inicial or \
       aluno.turma.ano_escolar > diagnostico.aplicavel_ano_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Este diagnóstico não é aplicável ao ano escolar do aluno"
        )

    # Check if result already exists
    existing = db.query(DiagnosticoResultado).filter(
        DiagnosticoResultado.diagnostico_id == resultado_data.diagnostico_id,
        DiagnosticoResultado.aluno_id == resultado_data.aluno_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um resultado para este aluno neste diagnóstico"
        )

    # Create result
    db_resultado = DiagnosticoResultado(
        diagnostico_id=resultado_data.diagnostico_id,
        aluno_id=resultado_data.aluno_id,
        professor_id=current_professor.id,
        nivel_evolucao=resultado_data.nivel_evolucao,
        observacoes=resultado_data.observacoes
    )

    db.add(db_resultado)
    db.commit()
    db.refresh(db_resultado)

    return db_resultado


@router.post("/resultados/bulk", status_code=status.HTTP_201_CREATED)
async def create_resultados_bulk(
    bulk_data: DiagnosticoResultadoBulk,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Apply diagnostic to multiple students at once"""
    results = []

    for resultado_data in bulk_data.resultados:
        try:
            # Check if result already exists
            existing = db.query(DiagnosticoResultado).filter(
                DiagnosticoResultado.diagnostico_id == resultado_data.diagnostico_id,
                DiagnosticoResultado.aluno_id == resultado_data.aluno_id
            ).first()

            if existing:
                # Update existing
                existing.nivel_evolucao = resultado_data.nivel_evolucao
                existing.observacoes = resultado_data.observacoes
                results.append({"aluno_id": resultado_data.aluno_id, "action": "updated"})
            else:
                # Create new
                db_resultado = DiagnosticoResultado(
                    diagnostico_id=resultado_data.diagnostico_id,
                    aluno_id=resultado_data.aluno_id,
                    professor_id=current_professor.id,
                    nivel_evolucao=resultado_data.nivel_evolucao,
                    observacoes=resultado_data.observacoes
                )
                db.add(db_resultado)
                results.append({"aluno_id": resultado_data.aluno_id, "action": "created"})

        except Exception as e:
            results.append({"aluno_id": resultado_data.aluno_id, "error": str(e)})

    db.commit()

    return {
        "message": f"Processados {len(results)} resultados de diagnóstico",
        "results": results
    }


@router.get("/resultados", response_model=List[DiagnosticoResultadoResponse])
async def list_resultados_diagnostico(
    diagnostico_id: int = None,
    aluno_id: int = None,
    turma_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List diagnostic results with filters"""
    query = db.query(DiagnosticoResultado)

    # Filter by professor if current user is professor
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        if current_user.professor:
            query = query.filter(DiagnosticoResultado.professor_id == current_user.professor.id)

    if diagnostico_id:
        query = query.filter(DiagnosticoResultado.diagnostico_id == diagnostico_id)

    if aluno_id:
        query = query.filter(DiagnosticoResultado.aluno_id == aluno_id)

    if turma_id:
        query = query.join(Aluno).filter(Aluno.turma_id == turma_id)

    resultados = query.offset(skip).limit(limit).all()
    return resultados


@router.put("/resultados/{resultado_id}", response_model=DiagnosticoResultadoResponse)
async def update_resultado_diagnostico(
    resultado_id: int,
    resultado_data: DiagnosticoResultadoUpdate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Update diagnostic result"""
    resultado = db.query(DiagnosticoResultado).filter(
        DiagnosticoResultado.id == resultado_id
    ).first()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resultado não encontrado"
        )

    # Verify ownership
    if resultado.professor_id != current_professor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode editar este resultado"
        )

    # Update fields
    if resultado_data.nivel_evolucao:
        resultado.nivel_evolucao = resultado_data.nivel_evolucao
    if resultado_data.observacoes is not None:
        resultado.observacoes = resultado_data.observacoes

    db.commit()
    db.refresh(resultado)

    return resultado
