"""
Classes/Grades Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Turma, Usuario, PerfilUsuario, Professor
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

    # Auto-fill ano_letivo if not provided
    ano_letivo = turma_data.ano_letivo if turma_data.ano_letivo else datetime.now().year

    # Check uniqueness
    existing = db.query(Turma).filter(
        Turma.nome == turma_data.nome,
        Turma.escola_id == turma_data.escola_id,
        Turma.ano_letivo == ano_letivo
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma turma com este nome nesta escola para este ano letivo"
        )

    # Create turma with auto-filled ano_letivo
    turma_dict = turma_data.dict(exclude_unset=True)
    turma_dict['ano_letivo'] = ano_letivo

    db_turma = Turma(**turma_dict)
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
    from ..models import Aluno

    query = db.query(Turma).options(
        joinedload(Turma.professor).joinedload(Professor.usuario),
        joinedload(Turma.escola)
    )

    # DIRETOR sees only their school's classes
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Turma.escola_id == current_user.escola_dirigida.id)

    if escola_id:
        query = query.filter(Turma.escola_id == escola_id)
    if ano_letivo:
        query = query.filter(Turma.ano_letivo == ano_letivo)

    turmas = query.filter(Turma.ativo == True).offset(skip).limit(limit).all()

    # Add total_alunos count to each turma
    result = []
    for turma in turmas:
        turma_dict = TurmaResponse.from_orm(turma).dict()
        # Count active students in this turma
        total_alunos = db.query(Aluno).filter(
            Aluno.turma_id == turma.id,
            Aluno.ativo == True
        ).count()
        turma_dict['total_alunos'] = total_alunos
        result.append(turma_dict)

    return result


@router.get("/{turma_id}", response_model=TurmaResponse)
async def get_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get class by ID"""
    from ..models import Aluno

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

    # Add total_alunos count
    turma_dict = TurmaResponse.from_orm(turma).dict()
    total_alunos = db.query(Aluno).filter(
        Aluno.turma_id == turma.id,
        Aluno.ativo == True
    ).count()
    turma_dict['total_alunos'] = total_alunos

    return turma_dict


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
    if turma_data.nome is not None:
        turma.nome = turma_data.nome
    if turma_data.turno is not None:
        turma.turno = turma_data.turno
    if turma_data.professor_id is not None:
        turma.professor_id = turma_data.professor_id
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
