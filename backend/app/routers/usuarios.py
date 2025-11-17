"""
Users Router
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Usuario, PerfilUsuario
from ..schemas import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    PasswordReset, PasswordResetBulk, PasswordChange
)
from ..auth import (
    get_current_active_user,
    require_gestao_municipal,
    require_diretor_or_gestao,
    get_password_hash,
    verify_password,
    generate_reset_password
)

router = APIRouter()


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_usuario(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Create a new user (GESTÃO MUNICIPAL only)
    """
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

    # Create user
    hashed_password = get_password_hash(usuario_data.senha)
    db_usuario = Usuario(
        cpf=usuario_data.cpf,
        nome_completo=usuario_data.nome_completo,
        email=usuario_data.email,
        telefone=usuario_data.telefone,
        perfil=usuario_data.perfil,
        senha_hash=hashed_password
    )

    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)

    return db_usuario


@router.get("/", response_model=List[UsuarioResponse])
async def list_usuarios(
    skip: int = 0,
    limit: int = 100,
    perfil: PerfilUsuario = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    List all users (GESTÃO MUNICIPAL only)
    Optional filter by perfil
    """
    query = db.query(Usuario)

    if perfil:
        query = query.filter(Usuario.perfil == perfil)

    usuarios = query.offset(skip).limit(limit).all()
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get user by ID
    Users can only see their own data unless they are GESTÃO MUNICIPAL
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Authorization check
    if current_user.perfil != PerfilUsuario.GESTAO_MUNICIPAL:
        if current_user.id != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode visualizar seus próprios dados"
            )

    return usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Update user data
    Users can only update their own data (except CPF)
    GESTÃO MUNICIPAL can update any user
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Authorization check
    if current_user.perfil != PerfilUsuario.GESTAO_MUNICIPAL:
        if current_user.id != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode atualizar seus próprios dados"
            )

    # Update fields
    if usuario_data.nome_completo:
        usuario.nome_completo = usuario_data.nome_completo
    if usuario_data.email:
        # Check email uniqueness
        existing = db.query(Usuario).filter(
            Usuario.email == usuario_data.email,
            Usuario.id != usuario_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está em uso"
            )
        usuario.email = usuario_data.email
    if usuario_data.telefone is not None:
        usuario.telefone = usuario_data.telefone
    if usuario_data.ativo is not None and current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        usuario.ativo = usuario_data.ativo

    db.commit()
    db.refresh(usuario)

    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Delete user (soft delete by setting ativo=False)
    GESTÃO MUNICIPAL only
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    usuario.ativo = False
    db.commit()

    return None


@router.post("/reset-password/{usuario_id}")
async def reset_password(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Reset user password
    GESTÃO MUNICIPAL can reset anyone's password
    DIRETOR can reset teachers' passwords in their school
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Authorization: Diretor can only reset teachers in their school
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if usuario.perfil != PerfilUsuario.PROFESSOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Diretores só podem resetar senhas de professores"
            )
        # Verify professor belongs to director's school
        if not usuario.professor or usuario.professor.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este professor não pertence à sua escola"
            )

    # Generate new password
    new_password = generate_reset_password()
    usuario.senha_hash = get_password_hash(new_password)

    db.commit()

    return {
        "message": "Senha resetada com sucesso",
        "nova_senha": new_password,
        "usuario_id": usuario_id
    }


@router.post("/reset-password-bulk")
async def reset_password_bulk(
    reset_data: PasswordResetBulk,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Reset passwords for multiple users
    Useful for bulk operations
    """
    results = []

    for usuario_id in reset_data.usuario_ids:
        try:
            usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

            if not usuario:
                results.append({
                    "usuario_id": usuario_id,
                    "success": False,
                    "error": "Usuário não encontrado"
                })
                continue

            # Authorization check
            if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
                if usuario.perfil != PerfilUsuario.PROFESSOR:
                    results.append({
                        "usuario_id": usuario_id,
                        "success": False,
                        "error": "Sem permissão"
                    })
                    continue
                if not usuario.professor or usuario.professor.escola_id != current_user.escola_dirigida.id:
                    results.append({
                        "usuario_id": usuario_id,
                        "success": False,
                        "error": "Professor não pertence à sua escola"
                    })
                    continue

            new_password = generate_reset_password()
            usuario.senha_hash = get_password_hash(new_password)

            results.append({
                "usuario_id": usuario_id,
                "success": True,
                "nova_senha": new_password
            })

        except Exception as e:
            results.append({
                "usuario_id": usuario_id,
                "success": False,
                "error": str(e)
            })

    db.commit()

    return {
        "message": f"Processadas {len(results)} solicitações de reset",
        "results": results
    }


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Change current user's password
    Requires current password for verification
    """
    # Verify current password
    if not verify_password(password_data.senha_atual, current_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )

    # Update password
    current_user.senha_hash = get_password_hash(password_data.senha_nova)
    db.commit()

    return {"message": "Senha alterada com sucesso"}
