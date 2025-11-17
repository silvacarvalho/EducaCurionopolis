"""
Authentication and Authorization System
JWT-based authentication with role-based access control
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from .database import get_db
from .models import Usuario, PerfilUsuario
from .schemas import TokenData

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours default

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ============================================
# PASSWORD UTILITIES
# ============================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Bcrypt has a maximum password length of 72 bytes
    # Validate byte length to handle UTF-8 characters properly
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        raise ValueError(
            f"Password is too long ({len(password_bytes)} bytes). "
            "Maximum length is 72 bytes (approximately 72 characters)."
        )
    return pwd_context.hash(password)


# ============================================
# USER AUTHENTICATION
# ============================================

def authenticate_user(db: Session, email: str, password: str) -> Optional[Usuario]:
    """
    Authenticate a user by email and password
    Returns Usuario object if authentication successful, None otherwise
    """
    usuario = db.query(Usuario).filter(Usuario.email == email).first()

    if not usuario:
        return None

    if not usuario.ativo:
        return None

    if not verify_password(password, usuario.senha_hash):
        return None

    return usuario


# ============================================
# JWT TOKEN OPERATIONS
# ============================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT token
    Returns TokenData if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        perfil: str = payload.get("perfil")

        if email is None:
            return None

        token_data = TokenData(email=email, perfil=perfil)
        return token_data

    except JWTError:
        return None


# ============================================
# DEPENDENCIES FOR ROUTE PROTECTION
# ============================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependency to get current authenticated user
    Raises HTTPException if authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = decode_access_token(token)

    if token_data is None or token_data.email is None:
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.email == token_data.email).first()

    if usuario is None:
        raise credentials_exception

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return usuario


async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """
    Dependency to ensure user is active
    """
    if not current_user.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


# ============================================
# ROLE-BASED ACCESS CONTROL
# ============================================

class RoleChecker:
    """
    Dependency class for role-based access control
    Usage: Depends(RoleChecker([PerfilUsuario.GESTAO_MUNICIPAL]))
    """

    def __init__(self, allowed_roles: list[PerfilUsuario]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Usuario = Depends(get_current_active_user)):
        if current_user.perfil not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Perfil requerido: {', '.join([r.value for r in self.allowed_roles])}"
            )
        return current_user


# ============================================
# SPECIFIC ROLE CHECKERS (Convenience)
# ============================================

def require_gestao_municipal(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Requires GESTÃO MUNICIPAL role"""
    if current_user.perfil != PerfilUsuario.GESTAO_MUNICIPAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para Gestão Municipal"
        )
    return current_user


def require_diretor_or_gestao(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Requires DIRETOR/COORDENADOR or GESTÃO MUNICIPAL role"""
    allowed_roles = [PerfilUsuario.DIRETOR_COORDENADOR, PerfilUsuario.GESTAO_MUNICIPAL]
    if current_user.perfil not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para Diretores/Coordenadores ou Gestão Municipal"
        )
    return current_user


def require_professor(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Requires PROFESSOR role"""
    if current_user.perfil != PerfilUsuario.PROFESSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para Professores"
        )
    return current_user


def require_professor_or_diretor(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Requires PROFESSOR or DIRETOR/COORDENADOR role"""
    allowed_roles = [PerfilUsuario.PROFESSOR, PerfilUsuario.DIRETOR_COORDENADOR]
    if current_user.perfil not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para Professores ou Diretores/Coordenadores"
        )
    return current_user


# ============================================
# OWNERSHIP VERIFICATION
# ============================================

def verify_school_ownership(
    escola_id: int,
    current_user: Usuario,
    db: Session
) -> bool:
    """
    Verify if a director owns a specific school
    Returns True if user is GESTAO_MUNICIPAL or owns the school
    """
    if current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        return True

    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida and current_user.escola_dirigida.id == escola_id:
            return True

    return False


def verify_professor_school(
    escola_id: int,
    current_user: Usuario,
    db: Session
) -> bool:
    """
    Verify if a professor belongs to a specific school
    Returns True if user belongs to the school
    """
    if current_user.perfil != PerfilUsuario.PROFESSOR:
        return False

    if current_user.professor and current_user.professor.escola_id == escola_id:
        return True

    return False


# ============================================
# PASSWORD RESET UTILITIES
# ============================================

def generate_reset_password(length: int = 8) -> str:
    """
    Generate a random password for reset
    """
    import secrets
    import string

    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for _ in range(length))

    return password
