"""
Setup Router - First-time configuration
Creates initial admin user when no admin exists
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Usuario, PerfilUsuario
from ..schemas import UsuarioCreate, UsuarioResponse
from ..auth import get_password_hash

router = APIRouter()


@router.post("/first-admin", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_first_admin(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db)
):
    """
    Create first admin user (Gestão Municipal)

    This endpoint only works if there are NO Gestão Municipal users in the system.
    After creating the first admin, use the normal authentication flow.

    - **cpf**: CPF in format 000.000.000-00
    - **nome_completo**: Full name
    - **email**: Email address
    - **senha**: Password (min 6 characters)
    - **perfil**: Will be forced to gestao_municipal
    """
    # Check if any Gestão Municipal user exists
    existing_admin = db.query(Usuario).filter(
        Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL
    ).first()

    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Um usuário administrador já existe no sistema. Use o login normal e crie novos usuários através da API autenticada."
        )

    # Check if CPF already exists
    if db.query(Usuario).filter(Usuario.cpf == usuario_data.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CPF já cadastrado"
        )

    # Check if email already exists
    if db.query(Usuario).filter(Usuario.email == usuario_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Force Gestão Municipal profile
    try:
        hashed_password = get_password_hash(usuario_data.senha)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    db_usuario = Usuario(
        cpf=usuario_data.cpf,
        nome_completo=usuario_data.nome_completo,
        email=usuario_data.email,
        telefone=usuario_data.telefone,
        perfil=PerfilUsuario.GESTAO_MUNICIPAL,  # Always admin
        senha_hash=hashed_password,
        ativo=True
    )

    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)

    return db_usuario


@router.get("/status")
async def setup_status(db: Session = Depends(get_db)):
    """
    Check if initial setup is needed

    Returns whether the system needs an initial admin user or not
    """
    admin_exists = db.query(Usuario).filter(
        Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL
    ).first() is not None

    total_users = db.query(Usuario).count()

    return {
        "setup_needed": not admin_exists,
        "admin_exists": admin_exists,
        "total_users": total_users,
        "message": "Sistema pronto para uso" if admin_exists else "Necessário criar primeiro usuário administrador"
    }
