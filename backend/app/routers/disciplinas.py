"""
Subjects Router - Refactored for N:M relationship with Turmas
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import Disciplina, Professor, Usuario, PerfilUsuario, Turma
from ..schemas import DisciplinaCreate, DisciplinaUpdate, DisciplinaResponse, VincularProfessorDisciplina
from ..auth import get_current_active_user, require_diretor_or_gestao

router = APIRouter()


@router.post("/", response_model=DisciplinaResponse, status_code=status.HTTP_201_CREATED)
async def create_disciplina(
    disciplina_data: DisciplinaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Create a new global subject
    Disciplinas are now global and can be linked to multiple turmas
    """
    # Check if disciplina with same name already exists (case-insensitive)
    nome_normalizado = disciplina_data.nome.strip().lower()
    existing_disciplina = db.query(Disciplina).filter(
        func.lower(func.trim(Disciplina.nome)) == nome_normalizado,
        Disciplina.ativo == True
    ).first()

    if existing_disciplina:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma disciplina '{disciplina_data.nome}' cadastrada"
        )

    db_disciplina = Disciplina(**disciplina_data.dict())
    db.add(db_disciplina)
    db.commit()
    db.refresh(db_disciplina)

    # Adicionar turmas_ids vazias para response
    db_disciplina.turmas_ids = [t.id for t in db_disciplina.turmas]

    return db_disciplina


@router.get("/", response_model=List[DisciplinaResponse])
async def list_disciplinas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List all global subjects"""
    disciplinas = db.query(Disciplina).filter(
        Disciplina.ativo == True
    ).offset(skip).limit(limit).all()
    
    # Adicionar turmas_ids para cada disciplina
    for disciplina in disciplinas:
        disciplina.turmas_ids = [t.id for t in disciplina.turmas]
    
    return disciplinas


@router.get("/turma/{turma_id}", response_model=List[DisciplinaResponse])
async def list_disciplinas_by_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List subjects linked to a specific turma"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )
    
    # Verificar acesso à escola
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or current_user.escola_dirigida.id != turma.escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta turma"
            )
    
    disciplinas = turma.disciplinas
    
    # Adicionar turmas_ids para cada disciplina
    for disciplina in disciplinas:
        disciplina.turmas_ids = [t.id for t in disciplina.turmas]
    
    return disciplinas


@router.post("/vincular-professor")
async def vincular_professor(
    vinculo_data: VincularProfessorDisciplina,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Link a teacher to a subject
    DIRETOR/COORDENADOR can link teachers to subjects
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


@router.put("/{disciplina_id}", response_model=DisciplinaResponse)
async def update_disciplina(
    disciplina_id: int,
    disciplina_data: DisciplinaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update subject data"""
    disciplina = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()

    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    # Update fields
    if disciplina_data.nome is not None:
        # Check if new name already exists (excluding current disciplina)
        nome_normalizado = disciplina_data.nome.strip().lower()
        existing_disciplina = db.query(Disciplina).filter(
            func.lower(func.trim(Disciplina.nome)) == nome_normalizado,
            Disciplina.id != disciplina_id,
            Disciplina.ativo == True
        ).first()

        if existing_disciplina:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outra disciplina '{disciplina_data.nome}' cadastrada"
            )

        disciplina.nome = disciplina_data.nome

    if disciplina_data.carga_horaria is not None:
        disciplina.carga_horaria = disciplina_data.carga_horaria
    if disciplina_data.ativo is not None:
        disciplina.ativo = disciplina_data.ativo

    db.commit()
    db.refresh(disciplina)

    # Adicionar turmas_ids para response
    disciplina.turmas_ids = [t.id for t in disciplina.turmas]

    return disciplina


@router.delete("/{disciplina_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disciplina(
    disciplina_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Soft delete subject
    This will unlink the disciplina from all turmas and professores
    """
    disciplina = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()

    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    disciplina.ativo = False
    db.commit()

    return None


@router.post("/", response_model=DisciplinaResponse, status_code=status.HTTP_201_CREATED)
async def create_disciplina(
    disciplina_data: DisciplinaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Create a new subject"""
    # Verify turma access (which also verifies escola access)
    verify_turma_access(disciplina_data.turma_id, current_user, db)

    # Check if disciplina with same name already exists in the same turma
    # case-insensitive check for existing discipline name in the same turma
    nome_normalizado = disciplina_data.nome.strip().lower()
    existing_disciplina = db.query(Disciplina).filter(
        Disciplina.turma_id == disciplina_data.turma_id,
        func.lower(func.trim(Disciplina.nome)) == nome_normalizado,
        Disciplina.ativo == True
    ).first()

    if existing_disciplina:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma disciplina '{disciplina_data.nome}' cadastrada nesta turma"
        )

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


@router.put("/{disciplina_id}", response_model=DisciplinaResponse)
async def update_disciplina(
    disciplina_id: int,
    disciplina_data: DisciplinaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update subject data"""
    disciplina = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()

    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    # Verify turma access
    verify_turma_access(disciplina.turma_id, current_user, db)

    # Update fields
    if disciplina_data.nome is not None:
        # Check if new name already exists in the same turma (excluding current disciplina)
        # case-insensitive check for other discipline with same name in the turma
        nome_normalizado = disciplina_data.nome.strip().lower()
        existing_disciplina = db.query(Disciplina).filter(
            Disciplina.turma_id == disciplina.turma_id,
            func.lower(func.trim(Disciplina.nome)) == nome_normalizado,
            Disciplina.id != disciplina_id,
            Disciplina.ativo == True
        ).first()

        if existing_disciplina:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outra disciplina '{disciplina_data.nome}' cadastrada nesta turma"
            )

        disciplina.nome = disciplina_data.nome

    if disciplina_data.carga_horaria is not None:
        disciplina.carga_horaria = disciplina_data.carga_horaria
    if disciplina_data.ativo is not None:
        disciplina.ativo = disciplina_data.ativo

    db.commit()
    db.refresh(disciplina)

    return disciplina


@router.delete("/{disciplina_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disciplina(
    disciplina_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Soft delete subject"""
    disciplina = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()

    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )

    # Verify turma access
    verify_turma_access(disciplina.turma_id, current_user, db)

    disciplina.ativo = False
    db.commit()

    return None
