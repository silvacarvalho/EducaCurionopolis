"""
Common dependencies for API routes
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, Union
from jose import jwt, JWTError

from .database import get_db
from .models import Usuario, Escola, Professor, Turma, Aluno, PerfilUsuario
from .auth import get_current_active_user
from .config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ============================================
# ENTITY GETTERS WITH VALIDATION
# ============================================

def get_escola_or_404(escola_id: int, db: Session = Depends(get_db)) -> Escola:
    """Get school by ID or raise 404"""
    escola = db.query(Escola).filter(Escola.id == escola_id).first()
    if not escola:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Escola com ID {escola_id} não encontrada"
        )
    return escola


def get_professor_or_404(professor_id: int, db: Session = Depends(get_db)) -> Professor:
    """Get teacher by ID or raise 404"""
    professor = db.query(Professor).filter(Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professor com ID {professor_id} não encontrado"
        )
    return professor


def get_turma_or_404(turma_id: int, db: Session = Depends(get_db)) -> Turma:
    """Get class by ID or raise 404"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turma com ID {turma_id} não encontrada"
        )
    return turma


def get_aluno_or_404(aluno_id: int, db: Session = Depends(get_db)) -> Aluno:
    """Get student by ID or raise 404"""
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aluno com ID {aluno_id} não encontrado"
        )
    return aluno


# ============================================
# PERMISSION VERIFIERS
# ============================================

def verify_escola_access(
    escola_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Escola:
    """
    Verify user has access to a specific school
    - GESTAO_MUNICIPAL: access to all schools
    - DIRETOR_COORDENADOR: access only to their school
    """
    escola = get_escola_or_404(escola_id, db)

    # Gestão Municipal has access to all schools
    if current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        return escola

    # Diretor/Coordenador can only access their own school
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida and current_user.escola_dirigida.id == escola_id:
            return escola

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Você não tem permissão para acessar esta escola"
    )


def verify_turma_access(
    turma_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Turma:
    """
    Verify user has access to a specific class
    Uses escola access verification
    """
    turma = get_turma_or_404(turma_id, db)

    # Verify access through escola
    verify_escola_access(turma.escola_id, current_user, db)

    return turma


def verify_aluno_access(
    aluno_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Aluno:
    """
    Verify user has access to a specific student
    Uses turma access verification
    """
    aluno = get_aluno_or_404(aluno_id, db)

    # Verify access through turma
    verify_turma_access(aluno.turma_id, current_user, db)

    return aluno


# ============================================
# PROFESSOR-SPECIFIC VERIFIERS
# ============================================

def get_current_professor(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Professor:
    """
    Get current user's professor profile
    Raises 403 if user is not a professor
    """
    if current_user.perfil != PerfilUsuario.PROFESSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta operação é permitida apenas para professores"
        )

    if not current_user.professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de professor não encontrado para este usuário"
        )

    return current_user.professor


def verify_professor_disciplina(
    disciplina_id: int,
    current_professor: Professor = Depends(get_current_professor),
    db: Session = Depends(get_db)
) -> bool:
    """
    Verify if current professor teaches a specific subject
    """
    disciplina_ids = [d.id for d in current_professor.disciplinas]

    if disciplina_id not in disciplina_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não leciona esta disciplina"
        )

    return True

# ============================================
# STUDENT TOKEN AUTHENTICATION
# ============================================

async def get_current_user_or_student(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Union[Usuario, dict]:
    """
    Dependency that accepts either:
    - Regular user authentication (Usuario)
    - Student token authentication (dict with student session data)
    
    Returns:
    - Usuario object for regular users
    - dict with keys: aluno_id, simulado_id, participacao_id, type='student_token' for students
    
    Use this for endpoints that students need to access (simulado details, questions, etc.)
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    settings = get_settings()
    
    try:
        # Try to decode token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Check if it's a student token
        token_type = payload.get("type")
        if token_type == "student_token":
            # Student token - return session data
            return {
                "type": "student_token",
                "aluno_id": payload.get("aluno_id"),
                "simulado_id": payload.get("simulado_id"),
                "participacao_id": payload.get("participacao_id")
            }
        
        # Regular user token
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        # Get user from database
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario or not usuario.ativo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return usuario
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )