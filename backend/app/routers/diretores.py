"""
Diretores Router
Director management endpoints (users with DIRETOR_COORDENADOR profile)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Usuario, Escola, PerfilUsuario
from ..schemas import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from ..auth import (
    get_current_active_user,
    require_gestao_municipal,
    get_password_hash
)

router = APIRouter()


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_diretor(
    diretor_data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Create a new director (GESTÃO MUNICIPAL only)
    Automatically sets perfil to DIRETOR_COORDENADOR
    """
    # Force perfil to be DIRETOR_COORDENADOR
    if diretor_data.perfil != PerfilUsuario.DIRETOR_COORDENADOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint é apenas para criar diretores. Use /api/v1/usuarios para outros perfis."
        )

    # Check if CPF already exists
    if db.query(Usuario).filter(Usuario.cpf == diretor_data.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF já cadastrado"
        )

    # Check if email already exists
    if db.query(Usuario).filter(Usuario.email == diretor_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Create director
    hashed_password = get_password_hash(diretor_data.senha)
    db_diretor = Usuario(
        cpf=diretor_data.cpf,
        nome_completo=diretor_data.nome_completo,
        email=diretor_data.email,
        telefone=diretor_data.telefone,
        perfil=PerfilUsuario.DIRETOR_COORDENADOR,
        senha_hash=hashed_password
    )

    db.add(db_diretor)
    db.commit()
    db.refresh(db_diretor)

    return db_diretor


@router.get("/", response_model=List[UsuarioResponse])
async def list_diretores(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    disponivel: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    List all directors (GESTÃO MUNICIPAL only)

    Query params:
    - ativo: Filter by active status
    - disponivel: If True, show only directors without assigned school
    """
    query = db.query(Usuario).filter(Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR)

    # Filter by ativo status
    if ativo is not None:
        query = query.filter(Usuario.ativo == ativo)

    # Filter by availability (directors without school)
    if disponivel is True:
        query = query.outerjoin(Escola, Usuario.id == Escola.diretor_id).filter(Escola.id == None)
    elif disponivel is False:
        query = query.join(Escola, Usuario.id == Escola.diretor_id)

    diretores = query.offset(skip).limit(limit).all()
    return diretores


@router.get("/{diretor_id}", response_model=UsuarioResponse)
async def get_diretor(
    diretor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Get director by ID (GESTÃO MUNICIPAL only)
    """
    diretor = db.query(Usuario).filter(
        Usuario.id == diretor_id,
        Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR
    ).first()

    if not diretor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diretor não encontrado"
        )

    return diretor


@router.put("/{diretor_id}", response_model=UsuarioResponse)
async def update_diretor(
    diretor_id: int,
    diretor_data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Update director data (GESTÃO MUNICIPAL only)
    """
    diretor = db.query(Usuario).filter(
        Usuario.id == diretor_id,
        Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR
    ).first()

    if not diretor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diretor não encontrado"
        )

    # Update fields
    if diretor_data.nome_completo:
        diretor.nome_completo = diretor_data.nome_completo

    if diretor_data.email:
        # Check email uniqueness
        existing = db.query(Usuario).filter(
            Usuario.email == diretor_data.email,
            Usuario.id != diretor_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )
        diretor.email = diretor_data.email

    if diretor_data.telefone is not None:
        diretor.telefone = diretor_data.telefone

    if diretor_data.ativo is not None:
        diretor.ativo = diretor_data.ativo

    db.commit()
    db.refresh(diretor)

    return diretor


@router.delete("/{diretor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diretor(
    diretor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Delete director (soft delete by setting ativo=False)
    GESTÃO MUNICIPAL only

    Note: If director is assigned to a school, the school will lose its director
    """
    diretor = db.query(Usuario).filter(
        Usuario.id == diretor_id,
        Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR
    ).first()

    if not diretor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diretor não encontrado"
        )

    # Check if diretor manages a school
    if diretor.escola_dirigida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Este diretor gerencia a escola '{diretor.escola_dirigida.nome}'. "
                   "Remova ou reatribua a escola antes de desativar o diretor."
        )

    diretor.ativo = False
    db.commit()

    return None


@router.get("/{diretor_id}/escola")
async def get_diretor_escola(
    diretor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Get the school managed by a specific director
    Returns null if director has no assigned school
    """
    diretor = db.query(Usuario).filter(
        Usuario.id == diretor_id,
        Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR
    ).first()

    if not diretor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diretor não encontrado"
        )

    if not diretor.escola_dirigida:
        return {
            "diretor_id": diretor_id,
            "escola": None,
            "message": "Este diretor não está atribuído a nenhuma escola"
        }

    return {
        "diretor_id": diretor_id,
        "escola": {
            "id": diretor.escola_dirigida.id,
            "nome": diretor.escola_dirigida.nome,
            "endereco": diretor.escola_dirigida.endereco,
            "codigo_inep": diretor.escola_dirigida.codigo_inep
        }
    }
