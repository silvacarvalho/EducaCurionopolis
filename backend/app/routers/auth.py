"""
Authentication Router
Handles login and token generation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from ..schemas import Token, UsuarioLogin, UsuarioResponse
from ..auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..models import Usuario

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login
    Get an access token for future requests
    """
    usuario = authenticate_user(db, form_data.username, form_data.password)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": usuario.email, "perfil": usuario.perfil.value},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
async def login_json(
    credentials: UsuarioLogin,
    db: Session = Depends(get_db)
):
    """
    JSON-based login (alternative to form-based)
    """
    usuario = authenticate_user(db, credentials.email, credentials.senha)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": usuario.email, "perfil": usuario.perfil.value},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UsuarioResponse)
async def read_users_me(
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get current user information
    """
    return current_user


@router.post("/logout")
async def logout():
    """
    Logout endpoint (JWT tokens are stateless, so this is mainly for client-side)
    Client should discard the token
    """
    return {
        "message": "Logout realizado com sucesso. Descarte o token do lado do cliente."
    }
