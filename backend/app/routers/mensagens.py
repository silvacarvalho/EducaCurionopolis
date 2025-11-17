"""
Messages Router
Internal messaging system
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Mensagem, Usuario, PerfilUsuario, Escola, Professor
from ..schemas import MensagemCreate, MensagemResponse
from ..auth import get_current_active_user, require_gestao_municipal, require_diretor_or_gestao

router = APIRouter()


@router.post("/", response_model=MensagemResponse, status_code=status.HTTP_201_CREATED)
async def send_mensagem(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Send a message
    GESTÃO MUNICIPAL can send to directors
    DIRETOR can send to teachers in their school
    """
    # Broadcast message (to all users of a type)
    if mensagem_data.broadcast:
        # Only GESTÃO MUNICIPAL can send broadcast messages
        if current_user.perfil != PerfilUsuario.GESTAO_MUNICIPAL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas Gestão Municipal pode enviar mensagens em broadcast"
            )

        # Create broadcast message
        db_mensagem = Mensagem(
            remetente_id=current_user.id,
            destinatario_id=None,
            assunto=mensagem_data.assunto,
            corpo=mensagem_data.corpo,
            broadcast=True
        )
        db.add(db_mensagem)
        db.commit()
        db.refresh(db_mensagem)

        return db_mensagem

    # Individual message
    if not mensagem_data.destinatario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="destinatario_id é obrigatório para mensagens não-broadcast"
        )

    # Verify destinatario exists
    destinatario = db.query(Usuario).filter(Usuario.id == mensagem_data.destinatario_id).first()
    if not destinatario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destinatário não encontrado"
        )

    # Authorization checks
    if current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        # Can send to anyone (typically directors)
        pass
    elif current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        # Can only send to teachers in their school
        if destinatario.perfil != PerfilUsuario.PROFESSOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Diretores só podem enviar mensagens para professores"
            )

        # Verify teacher belongs to director's school
        if not destinatario.professor or \
           not current_user.escola_dirigida or \
           destinatario.professor.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este professor não pertence à sua escola"
            )

    # Create message
    db_mensagem = Mensagem(
        remetente_id=current_user.id,
        destinatario_id=mensagem_data.destinatario_id,
        assunto=mensagem_data.assunto,
        corpo=mensagem_data.corpo,
        broadcast=False
    )

    db.add(db_mensagem)
    db.commit()
    db.refresh(db_mensagem)

    return db_mensagem


@router.post("/broadcast-diretores")
async def send_broadcast_diretores(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Send broadcast message to all directors
    GESTÃO MUNICIPAL only
    """
    # Get all directors
    diretores = db.query(Usuario).filter(
        Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR,
        Usuario.ativo == True
    ).all()

    messages_sent = []

    for diretor in diretores:
        db_mensagem = Mensagem(
            remetente_id=current_user.id,
            destinatario_id=diretor.id,
            assunto=mensagem_data.assunto,
            corpo=mensagem_data.corpo,
            broadcast=False
        )
        db.add(db_mensagem)
        messages_sent.append(diretor.id)

    db.commit()

    return {
        "message": f"Mensagem enviada para {len(messages_sent)} diretores",
        "destinatarios": messages_sent
    }


@router.post("/broadcast-professores")
async def send_broadcast_professores(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Send broadcast message to teachers
    DIRETOR sends to teachers in their school
    GESTÃO MUNICIPAL sends to all teachers
    """
    query = db.query(Usuario).filter(
        Usuario.perfil == PerfilUsuario.PROFESSOR,
        Usuario.ativo == True
    )

    # If diretor, filter by their school
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Diretor sem escola vinculada"
            )

        query = query.join(Professor).filter(
            Professor.escola_id == current_user.escola_dirigida.id
        )

    professores = query.all()
    messages_sent = []

    for professor in professores:
        db_mensagem = Mensagem(
            remetente_id=current_user.id,
            destinatario_id=professor.id,
            assunto=mensagem_data.assunto,
            corpo=mensagem_data.corpo,
            broadcast=False
        )
        db.add(db_mensagem)
        messages_sent.append(professor.id)

    db.commit()

    return {
        "message": f"Mensagem enviada para {len(messages_sent)} professores",
        "destinatarios": messages_sent
    }


@router.get("/inbox", response_model=List[MensagemResponse])
async def get_inbox(
    lida: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get current user's inbox"""
    query = db.query(Mensagem).filter(Mensagem.destinatario_id == current_user.id)

    if lida is not None:
        query = query.filter(Mensagem.lida == lida)

    mensagens = query.order_by(Mensagem.created_at.desc()).offset(skip).limit(limit).all()
    return mensagens


@router.get("/sent", response_model=List[MensagemResponse])
async def get_sent(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get current user's sent messages"""
    mensagens = db.query(Mensagem).filter(
        Mensagem.remetente_id == current_user.id
    ).order_by(Mensagem.created_at.desc()).offset(skip).limit(limit).all()

    return mensagens


@router.post("/{mensagem_id}/mark-read")
async def mark_as_read(
    mensagem_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Mark message as read"""
    mensagem = db.query(Mensagem).filter(Mensagem.id == mensagem_id).first()

    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada"
        )

    # Verify ownership
    if mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode marcar esta mensagem como lida"
        )

    mensagem.lida = True
    mensagem.lida_em = datetime.utcnow()
    db.commit()

    return {"message": "Mensagem marcada como lida"}


@router.get("/{mensagem_id}", response_model=MensagemResponse)
async def get_mensagem(
    mensagem_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get specific message"""
    mensagem = db.query(Mensagem).filter(Mensagem.id == mensagem_id).first()

    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada"
        )

    # Verify user is sender or recipient
    if mensagem.remetente_id != current_user.id and mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    return mensagem
