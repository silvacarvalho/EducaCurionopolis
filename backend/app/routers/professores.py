"""
Teachers Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Professor, Usuario, Escola, PerfilUsuario
from ..schemas import ProfessorCreate, ProfessorUpdate, ProfessorResponse, UsuarioCreate
from ..auth import get_current_active_user, require_diretor_or_gestao, get_password_hash
from ..dependencies import verify_escola_access

router = APIRouter()


@router.post("/", response_model=ProfessorResponse, status_code=status.HTTP_201_CREATED)
async def create_professor(
    professor_data: ProfessorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Create a new teacher
    DIRETOR can create for their school
    GESTÃO MUNICIPAL can create for any school
    """
    # Verify escola access
    verify_escola_access(professor_data.escola_id, current_user, db)

    # Create usuario first
    usuario_data = professor_data.usuario

    # Check if CPF exists
    if db.query(Usuario).filter(Usuario.cpf == usuario_data.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF já cadastrado"
        )

    # Check if email exists
    if db.query(Usuario).filter(Usuario.email == usuario_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Create usuario with PROFESSOR perfil
    db_usuario = Usuario(
        cpf=usuario_data.cpf,
        nome_completo=usuario_data.nome_completo,
        email=usuario_data.email,
        telefone=usuario_data.telefone,
        perfil=PerfilUsuario.PROFESSOR,
        senha_hash=get_password_hash(usuario_data.senha)
    )
    db.add(db_usuario)
    db.flush()

    # Create professor
    db_professor = Professor(
        usuario_id=db_usuario.id,
        escola_id=professor_data.escola_id,
        matricula=professor_data.matricula,
        formacao=professor_data.formacao
    )

    db.add(db_professor)
    db.commit()
    db.refresh(db_professor)

    return db_professor


@router.get("/", response_model=List[ProfessorResponse])
async def list_professores(
    escola_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    List teachers
    Filtered by escola_id if provided
    """
    query = db.query(Professor)

    # DIRETOR sees only their school's teachers
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Professor.escola_id == current_user.escola_dirigida.id)

    if escola_id:
        # Verify access to escola
        if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
            if not current_user.escola_dirigida or current_user.escola_dirigida.id != escola_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acesso negado"
                )
        query = query.filter(Professor.escola_id == escola_id)

    professores = query.filter(Professor.ativo == True).offset(skip).limit(limit).all()
    return professores


@router.get("/{professor_id}", response_model=ProfessorResponse)
async def get_professor(
    professor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get teacher by ID"""
    professor = db.query(Professor).filter(Professor.id == professor_id).first()

    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or professor.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    return professor


@router.put("/{professor_id}", response_model=ProfessorResponse)
async def update_professor(
    professor_id: int,
    professor_data: ProfessorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update teacher data"""
    professor = db.query(Professor).filter(Professor.id == professor_id).first()

    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or professor.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    # Update fields
    if professor_data.formacao is not None:
        professor.formacao = professor_data.formacao
    if professor_data.ativo is not None:
        professor.ativo = professor_data.ativo

    db.commit()
    db.refresh(professor)

    return professor


@router.delete("/{professor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_professor(
    professor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Soft delete teacher"""
    professor = db.query(Professor).filter(Professor.id == professor_id).first()

    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or professor.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    professor.ativo = False
    db.commit()

    return None
