"""
Subjects Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Disciplina, Professor, Usuario, PerfilUsuario
from ..schemas import DisciplinaCreate, DisciplinaUpdate, DisciplinaResponse, VincularProfessorDisciplina
from ..auth import get_current_active_user, require_diretor_or_gestao
from ..dependencies import verify_turma_access

router = APIRouter()


@router.post("/", response_model=DisciplinaResponse, status_code=status.HTTP_201_CREATED)
async def create_disciplina(
    disciplina_data: DisciplinaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Create a new subject"""
    # Verify turma access (which also verifies escola access)
    verify_turma_access(disciplina_data.turma_id, current_user, db)

    db_disciplina = Disciplina(**disciplina_data.dict())
    db.add(db_disciplina)
    db.commit()
    db.refresh(db_disciplina)

    return db_disciplina


@router.get("/", response_model=List[DisciplinaResponse])
async def list_disciplinas(
    turma_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List subjects"""
    query = db.query(Disciplina)

    if turma_id:
        query = query.filter(Disciplina.turma_id == turma_id)

    disciplinas = query.filter(Disciplina.ativo == True).offset(skip).limit(limit).all()
    return disciplinas


@router.post("/vincular-professor")
async def vincular_professor(
    vinculo_data: VincularProfessorDisciplina,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Link a teacher to a subject
    DIRETOR/COORDENADOR can link teachers to subjects in their school
    """
    professor = db.query(Professor).filter(Professor.id == vinculo_data.professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado"
        )

    disciplina = db.query(Disciplina).filter(Disciplina.id == vinculo_data.disciplina_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    # Verify escola access
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

        escola_id = current_user.escola_dirigida.id

        # Check professor belongs to the school
        if professor.escola_id != escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Professor não pertence à sua escola"
            )

        # Check disciplina's turma belongs to the school
        if disciplina.turma.escola_id != escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Disciplina não pertence à sua escola"
            )

    # Check if already linked
    if disciplina in professor.disciplinas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professor já vinculado a esta disciplina"
        )

    # Create link
    professor.disciplinas.append(disciplina)
    db.commit()

    return {
        "message": "Professor vinculado à disciplina com sucesso",
        "professor_id": professor.id,
        "disciplina_id": disciplina.id
    }


@router.delete("/desvincular-professor")
async def desvincular_professor(
    vinculo_data: VincularProfessorDisciplina,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Unlink a teacher from a subject"""
    professor = db.query(Professor).filter(Professor.id == vinculo_data.professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado"
        )

    disciplina = db.query(Disciplina).filter(Disciplina.id == vinculo_data.disciplina_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    # Remove link
    if disciplina in professor.disciplinas:
        professor.disciplinas.remove(disciplina)
        db.commit()

        return {
            "message": "Professor desvinculado da disciplina com sucesso",
            "professor_id": professor.id,
            "disciplina_id": disciplina.id
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professor não está vinculado a esta disciplina"
        )
