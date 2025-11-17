"""
Classes/Grades Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Turma, Usuario, PerfilUsuario
from ..schemas import TurmaCreate, TurmaUpdate, TurmaResponse
from ..auth import get_current_active_user, require_diretor_or_gestao
from ..dependencies import verify_escola_access

router = APIRouter()


@router.post("/", response_model=TurmaResponse, status_code=status.HTTP_201_CREATED)
async def create_turma(
    turma_data: TurmaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Create a new class"""
    # Verify escola access
    verify_escola_access(turma_data.escola_id, current_user, db)

    # Check uniqueness
    existing = db.query(Turma).filter(
        Turma.nome == turma_data.nome,
        Turma.escola_id == turma_data.escola_id,
        Turma.ano_letivo == turma_data.ano_letivo
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma turma com este nome nesta escola para este ano letivo"
        )

    db_turma = Turma(**turma_data.dict())
    db.add(db_turma)
    db.commit()
    db.refresh(db_turma)

    return db_turma


@router.get("/", response_model=List[TurmaResponse])
async def list_turmas(
    escola_id: int = None,
    ano_letivo: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List classes with optional filters"""
    query = db.query(Turma)

    # DIRETOR sees only their school's classes
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Turma.escola_id == current_user.escola_dirigida.id)

    if escola_id:
        query = query.filter(Turma.escola_id == escola_id)
    if ano_letivo:
        query = query.filter(Turma.ano_letivo == ano_letivo)

    turmas = query.filter(Turma.ativo == True).offset(skip).limit(limit).all()
    return turmas


@router.get("/{turma_id}", response_model=TurmaResponse)
async def get_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get class by ID"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    return turma


@router.put("/{turma_id}", response_model=TurmaResponse)
async def update_turma(
    turma_id: int,
    turma_data: TurmaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update class data"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Authorization
    verify_escola_access(turma.escola_id, current_user, db)

    # Update fields
    if turma_data.nome:
        turma.nome = turma_data.nome
    if turma_data.turno is not None:
        turma.turno = turma_data.turno
    if turma_data.ativo is not None:
        turma.ativo = turma_data.ativo

    db.commit()
    db.refresh(turma)

    return turma


@router.delete("/{turma_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Soft delete class"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    verify_escola_access(turma.escola_id, current_user, db)

    turma.ativo = False
    db.commit()

    return None
