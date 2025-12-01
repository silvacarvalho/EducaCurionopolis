"""
Students Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from ..models import Aluno, Usuario, PerfilUsuario, Turma, Escola
from ..schemas import AlunoCreate, AlunoUpdate, AlunoResponse
from ..auth import get_current_active_user, require_diretor_or_gestao
from ..dependencies import verify_turma_access

router = APIRouter()


@router.post("/", response_model=AlunoResponse, status_code=status.HTTP_201_CREATED)
async def create_aluno(
    aluno_data: AlunoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Create a new student"""
    try:
        # Verify turma access
        verify_turma_access(aluno_data.turma_id, current_user, db)

        # Check matricula uniqueness
        if db.query(Aluno).filter(Aluno.matricula == aluno_data.matricula).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Matrícula já cadastrada"
            )

        # Check CPF uniqueness if provided
        if aluno_data.cpf:
            if db.query(Aluno).filter(Aluno.cpf == aluno_data.cpf).first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF já cadastrado"
                )

        db_aluno = Aluno(**aluno_data.dict())
        db.add(db_aluno)
        db.commit()
        db.refresh(db_aluno)

        return db_aluno

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        # Log the error for debugging
        print(f"Erro ao criar aluno: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar aluno: {str(e)}"
        )


@router.get("/", response_model=List[AlunoResponse])
async def list_alunos(
    turma_id: int = None,
    escola_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List students with optional filters"""
    query = db.query(Aluno).options(
        joinedload(Aluno.turma).joinedload(Turma.escola)
    )

    # DIRETOR sees only students from their school
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Aluno.turma.has(Turma.escola_id == current_user.escola_dirigida.id))

    if turma_id:
        query = query.filter(Aluno.turma_id == turma_id)

    if escola_id:
        query = query.filter(Aluno.turma.has(Turma.escola_id == escola_id))

    alunos = query.filter(Aluno.ativo == True).offset(skip).limit(limit).all()
    return alunos


@router.get("/{aluno_id}", response_model=AlunoResponse)
async def get_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get student by ID"""
    aluno = db.query(Aluno).options(
        joinedload(Aluno.turma).joinedload(Turma.escola)
    ).filter(Aluno.id == aluno_id).first()

    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or aluno.turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    return aluno


@router.put("/{aluno_id}", response_model=AlunoResponse)
async def update_aluno(
    aluno_id: int,
    aluno_data: AlunoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update student data"""
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()

    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or aluno.turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    # Update fields
    if aluno_data.nome_completo:
        aluno.nome_completo = aluno_data.nome_completo
    if aluno_data.turma_id:
        # Verify new turma access
        verify_turma_access(aluno_data.turma_id, current_user, db)
        aluno.turma_id = aluno_data.turma_id
    if aluno_data.nome_responsavel is not None:
        aluno.nome_responsavel = aluno_data.nome_responsavel
    if aluno_data.telefone_responsavel is not None:
        aluno.telefone_responsavel = aluno_data.telefone_responsavel
    if aluno_data.ativo is not None:
        aluno.ativo = aluno_data.ativo

    db.commit()
    db.refresh(aluno)

    return aluno


@router.delete("/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Soft delete student"""
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()

    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or aluno.turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    aluno.ativo = False
    db.commit()

    return None
