"""
Common dependencies for API routes
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Union
from jose import jwt, JWTError

from .database import get_db
from .models import Usuario, Escola, Professor, Turma, Aluno, PerfilUsuario
from .auth import get_current_active_user, oauth2_scheme_optional
from .config import get_settings


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
# STUDENT TOKEN AUTHENTICATION (SEPARATE FROM USER AUTH)
# ============================================

async def get_current_student_from_token(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependency for STUDENT-ONLY authentication via access token.
    
    This is completely separate from regular user authentication.
    Only validates student tokens generated for simulado access.
    
    Returns:
    - dict with keys: aluno_id, simulado_id, participacao_id, type='student_token'
    
    Raises 401 if:
    - No token provided
    - Token is invalid
    - Token is not a student token
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso do aluno é obrigatório",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    settings = get_settings()
    
    try:
        # Decode token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Validate it's a student token
        token_type = payload.get("type")
        if token_type != "student_token":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido. Use o token de acesso do aluno fornecido pelo professor."
            )
        
        # Extract student session data
        aluno_id = payload.get("aluno_id")
        simulado_id = payload.get("simulado_id")
        participacao_id = payload.get("participacao_id")
        
        if not aluno_id or not simulado_id or not participacao_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de acesso incompleto"
            )
        
        # Verify student exists
        aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
        if not aluno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Aluno não encontrado"
            )
        
        return {
            "type": "student_token",
            "aluno_id": aluno_id,
            "simulado_id": simulado_id,
            "participacao_id": participacao_id
        }
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )