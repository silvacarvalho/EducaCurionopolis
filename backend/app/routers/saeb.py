"""
SAEB Module Router
SAEB simulated exam management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import ProvaSimuladoSAEB, ResultadoSAEB, Aluno, Professor, Usuario, PerfilUsuario
from ..schemas import (
    ProvaSimuladoSAEBCreate, ProvaSimuladoSAEBUpdate, ProvaSimuladoSAEBResponse,
    ResultadoSAEBCreate, ResultadoSAEBUpdate, ResultadoSAEBResponse,
    ResultadoSAEBBulk
)
from ..auth import get_current_active_user, require_gestao_municipal
from ..dependencies import get_current_professor

router = APIRouter()


# ============================================
# SAEB EXAM MANAGEMENT
# ============================================

@router.post("/provas", response_model=ProvaSimuladoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_prova_saeb(
    prova_data: ProvaSimuladoSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Create SAEB exam (GESTÃO MUNICIPAL only)"""
    db_prova = ProvaSimuladoSAEB(**prova_data.dict())
    db.add(db_prova)
    db.commit()
    db.refresh(db_prova)

    return db_prova


@router.get("/provas", response_model=List[ProvaSimuladoSAEBResponse])
async def list_provas_saeb(
    ano_letivo: int = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List SAEB exams"""
    query = db.query(ProvaSimuladoSAEB)

    if ano_letivo:
        query = query.filter(ProvaSimuladoSAEB.ano_letivo == ano_letivo)
    if ativo is not None:
        query = query.filter(ProvaSimuladoSAEB.ativo == ativo)

    provas = query.offset(skip).limit(limit).all()
    return provas


@router.get("/provas/{prova_id}", response_model=ProvaSimuladoSAEBResponse)
async def get_prova_saeb(
    prova_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get SAEB exam by ID"""
    prova = db.query(ProvaSimuladoSAEB).filter(ProvaSimuladoSAEB.id == prova_id).first()

    if not prova:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prova SAEB não encontrada"
        )

    return prova


@router.put("/provas/{prova_id}", response_model=ProvaSimuladoSAEBResponse)
async def update_prova_saeb(
    prova_id: int,
    prova_data: ProvaSimuladoSAEBUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update SAEB exam"""
    prova = db.query(ProvaSimuladoSAEB).filter(ProvaSimuladoSAEB.id == prova_id).first()

    if not prova:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prova SAEB não encontrada"
        )

    if prova_data.nome:
        prova.nome = prova_data.nome
    if prova_data.data_aplicacao_prevista is not None:
        prova.data_aplicacao_prevista = prova_data.data_aplicacao_prevista
    if prova_data.descricao is not None:
        prova.descricao = prova_data.descricao
    if prova_data.ativo is not None:
        prova.ativo = prova_data.ativo

    db.commit()
    db.refresh(prova)

    return prova


# ============================================
# SAEB RESULTS MANAGEMENT
# ============================================

@router.post("/resultados", response_model=ResultadoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_resultado_saeb(
    resultado_data: ResultadoSAEBCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Apply SAEB exam result (PROFESSOR only)"""
    # Verify prova exists
    prova = db.query(ProvaSimuladoSAEB).filter(
        ProvaSimuladoSAEB.id == resultado_data.prova_id,
        ProvaSimuladoSAEB.ativo == True
    ).first()

    if not prova:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prova SAEB não encontrada ou inativa"
        )

    # Verify aluno exists
    aluno = db.query(Aluno).filter(Aluno.id == resultado_data.aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Check if result already exists
    existing = db.query(ResultadoSAEB).filter(
        ResultadoSAEB.prova_id == resultado_data.prova_id,
        ResultadoSAEB.aluno_id == resultado_data.aluno_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um resultado para este aluno nesta prova"
        )

    # Create result
    db_resultado = ResultadoSAEB(**resultado_data.dict())
    db.add(db_resultado)
    db.commit()
    db.refresh(db_resultado)

    return db_resultado


@router.post("/resultados/bulk", status_code=status.HTTP_201_CREATED)
async def create_resultados_saeb_bulk(
    bulk_data: ResultadoSAEBBulk,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Apply SAEB exam results to multiple students"""
    results = []

    for resultado_data in bulk_data.resultados:
        try:
            # Check if result already exists
            existing = db.query(ResultadoSAEB).filter(
                ResultadoSAEB.prova_id == resultado_data.prova_id,
                ResultadoSAEB.aluno_id == resultado_data.aluno_id
            ).first()

            if existing:
                # Update existing
                existing.nota_portugues = resultado_data.nota_portugues
                existing.nota_matematica = resultado_data.nota_matematica
                existing.presente = resultado_data.presente
                existing.observacoes = resultado_data.observacoes
                results.append({"aluno_id": resultado_data.aluno_id, "action": "updated"})
            else:
                # Create new
                db_resultado = ResultadoSAEB(**resultado_data.dict())
                db.add(db_resultado)
                results.append({"aluno_id": resultado_data.aluno_id, "action": "created"})

        except Exception as e:
            results.append({"aluno_id": resultado_data.aluno_id, "error": str(e)})

    db.commit()

    return {
        "message": f"Processados {len(results)} resultados SAEB",
        "results": results
    }


@router.get("/resultados", response_model=List[ResultadoSAEBResponse])
async def list_resultados_saeb(
    prova_id: int = None,
    aluno_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List SAEB results with filters"""
    query = db.query(ResultadoSAEB)

    if prova_id:
        query = query.filter(ResultadoSAEB.prova_id == prova_id)
    if aluno_id:
        query = query.filter(ResultadoSAEB.aluno_id == aluno_id)

    resultados = query.offset(skip).limit(limit).all()
    return resultados


@router.get("/resultados/{resultado_id}", response_model=ResultadoSAEBResponse)
async def get_resultado_saeb(
    resultado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get SAEB result by ID"""
    resultado = db.query(ResultadoSAEB).filter(ResultadoSAEB.id == resultado_id).first()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resultado não encontrado"
        )

    return resultado


@router.put("/resultados/{resultado_id}", response_model=ResultadoSAEBResponse)
async def update_resultado_saeb(
    resultado_id: int,
    resultado_data: ResultadoSAEBUpdate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Update SAEB result"""
    resultado = db.query(ResultadoSAEB).filter(ResultadoSAEB.id == resultado_id).first()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resultado não encontrado"
        )

    # Update fields
    if resultado_data.nota_portugues is not None:
        resultado.nota_portugues = resultado_data.nota_portugues
    if resultado_data.nota_matematica is not None:
        resultado.nota_matematica = resultado_data.nota_matematica
    if resultado_data.presente is not None:
        resultado.presente = resultado_data.presente
    if resultado_data.observacoes is not None:
        resultado.observacoes = resultado_data.observacoes

    db.commit()
    db.refresh(resultado)

    return resultado
