"""
Messages Router
Internal messaging system with real-time support
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Mensagem, Usuario, PerfilUsuario, Escola, Professor, PrioridadeMensagem as ModelPrioridade
from ..schemas import (
    MensagemCreate, MensagemResponse, MensagemComRespostas,
    DestinatarioResponse, ContadorMensagens, UsuarioSimples,
    PrioridadeMensagem as SchemaPrioridade
)
from ..auth import get_current_active_user, require_gestao_municipal, require_diretor_or_gestao
from ..websocket import manager

router = APIRouter()


def get_model_prioridade(schema_prioridade):
    """Convert schema prioridade to model prioridade"""
    if schema_prioridade is None:
        return ModelPrioridade.NORMAL
    # Get the string value and convert to model enum
    value = schema_prioridade.value if hasattr(schema_prioridade, 'value') else str(schema_prioridade)
    return ModelPrioridade(value)


def usuario_to_simples(usuario: Usuario) -> dict:
    """Convert Usuario to simplified dict for response"""
    if not usuario:
        return None
    return {
        "id": usuario.id,
        "nome_completo": usuario.nome_completo,
        "email": usuario.email,
        "perfil": usuario.perfil.value
    }


def mensagem_to_response(mensagem: Mensagem) -> dict:
    """Convert Mensagem model to response dict with user info"""
    return {
        "id": mensagem.id,
        "remetente_id": mensagem.remetente_id,
        "destinatario_id": mensagem.destinatario_id,
        "assunto": mensagem.assunto,
        "corpo": mensagem.corpo,
        "lida": mensagem.lida,
        "broadcast": mensagem.broadcast,
        "prioridade": mensagem.prioridade.value if mensagem.prioridade else "normal",
        "mensagem_pai_id": mensagem.mensagem_pai_id,
        "created_at": mensagem.created_at,
        "lida_em": mensagem.lida_em,
        "remetente": usuario_to_simples(mensagem.remetente) if mensagem.remetente else None,
        "destinatario": usuario_to_simples(mensagem.destinatario) if mensagem.destinatario else None
    }


@router.get("/destinatarios", response_model=List[DestinatarioResponse])
async def get_destinatarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get available recipients based on user's role
    """
    destinatarios = []
    
    if current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        # Can message all directors and professors
        usuarios = db.query(Usuario).filter(
            Usuario.perfil.in_([PerfilUsuario.DIRETOR_COORDENADOR, PerfilUsuario.PROFESSOR]),
            Usuario.ativo == True,
            Usuario.id != current_user.id
        ).all()
        
        for u in usuarios:
            escola_nome = None
            if u.perfil == PerfilUsuario.DIRETOR_COORDENADOR and u.escola_dirigida:
                escola_nome = u.escola_dirigida.nome
            elif u.perfil == PerfilUsuario.PROFESSOR and u.professor:
                escola = db.query(Escola).filter(Escola.id == u.professor.escola_id).first()
                if escola:
                    escola_nome = escola.nome
            
            destinatarios.append({
                "id": u.id,
                "nome_completo": u.nome_completo,
                "email": u.email,
                "perfil": u.perfil.value,
                "escola_nome": escola_nome
            })
    
    elif current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        # Can message gestão municipal and professors in their school
        gestao_users = db.query(Usuario).filter(
            Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL,
            Usuario.ativo == True
        ).all()
        
        for u in gestao_users:
            destinatarios.append({
                "id": u.id,
                "nome_completo": u.nome_completo,
                "email": u.email,
                "perfil": u.perfil.value,
                "escola_nome": "Gestão Municipal"
            })
        
        # Get professors in their school
        if current_user.escola_dirigida:
            professores = db.query(Usuario).join(Professor).filter(
                Professor.escola_id == current_user.escola_dirigida.id,
                Usuario.ativo == True,
                Usuario.id != current_user.id
            ).all()
            
            for u in professores:
                destinatarios.append({
                    "id": u.id,
                    "nome_completo": u.nome_completo,
                    "email": u.email,
                    "perfil": u.perfil.value,
                    "escola_nome": current_user.escola_dirigida.nome
                })
    
    elif current_user.perfil == PerfilUsuario.PROFESSOR:
        # Can message gestão municipal and their director
        gestao_users = db.query(Usuario).filter(
            Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL,
            Usuario.ativo == True
        ).all()
        
        for u in gestao_users:
            destinatarios.append({
                "id": u.id,
                "nome_completo": u.nome_completo,
                "email": u.email,
                "perfil": u.perfil.value,
                "escola_nome": "Gestão Municipal"
            })
        
        # Get their school's director
        if current_user.professor:
            escola = db.query(Escola).filter(
                Escola.id == current_user.professor.escola_id
            ).first()
            
            if escola and escola.diretor:
                destinatarios.append({
                    "id": escola.diretor.id,
                    "nome_completo": escola.diretor.nome_completo,
                    "email": escola.diretor.email,
                    "perfil": escola.diretor.perfil.value,
                    "escola_nome": escola.nome
                })
    
    return destinatarios


@router.get("/contador", response_model=ContadorMensagens)
async def get_contador_mensagens(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get count of unread messages for current user"""
    nao_lidas = db.query(func.count(Mensagem.id)).filter(
        Mensagem.destinatario_id == current_user.id,
        Mensagem.lida == False
    ).scalar()
    
    total = db.query(func.count(Mensagem.id)).filter(
        Mensagem.destinatario_id == current_user.id
    ).scalar()
    
    return {"nao_lidas": nao_lidas or 0, "total": total or 0}


@router.post("/", response_model=MensagemResponse, status_code=status.HTTP_201_CREATED)
async def send_mensagem(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Send a message to one or multiple recipients"""
    # Handle multiple recipients
    if mensagem_data.destinatario_ids and len(mensagem_data.destinatario_ids) > 0:
        messages_sent = []
        for dest_id in mensagem_data.destinatario_ids:
            destinatario = db.query(Usuario).filter(Usuario.id == dest_id).first()
            if destinatario:
                db_mensagem = Mensagem(
                    remetente_id=current_user.id,
                    destinatario_id=dest_id,
                    assunto=mensagem_data.assunto,
                    corpo=mensagem_data.corpo,
                    broadcast=False,
                    prioridade=get_model_prioridade(mensagem_data.prioridade)
                )
                db.add(db_mensagem)
                messages_sent.append(dest_id)
        
        db.commit()
        
        # Send notifications
        for dest_id in messages_sent:
            try:
                await manager.notify_new_message(
                    destinatario_id=dest_id,
                    mensagem_id=0,
                    remetente_nome=current_user.nome_completo,
                    assunto=mensagem_data.assunto,
                    prioridade=mensagem_data.prioridade.value if mensagem_data.prioridade else "normal"
                )
            except Exception as e:
                print(f"[WebSocket] Error notifying user {dest_id}: {e}")
        
        # Return a dummy response for multi-send
        return {
            "id": 0,
            "remetente_id": current_user.id,
            "destinatario_id": None,
            "assunto": mensagem_data.assunto,
            "corpo": mensagem_data.corpo,
            "lida": False,
            "broadcast": False,
            "prioridade": mensagem_data.prioridade.value if mensagem_data.prioridade else "normal",
            "mensagem_pai_id": None,
            "created_at": datetime.utcnow(),
            "lida_em": None,
            "remetente": usuario_to_simples(current_user),
            "destinatario": None
        }
    
    # Single recipient
    if not mensagem_data.destinatario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="destinatario_id é obrigatório"
        )

    destinatario = db.query(Usuario).filter(Usuario.id == mensagem_data.destinatario_id).first()
    if not destinatario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destinatário não encontrado"
        )

    db_mensagem = Mensagem(
        remetente_id=current_user.id,
        destinatario_id=mensagem_data.destinatario_id,
        assunto=mensagem_data.assunto,
        corpo=mensagem_data.corpo,
        broadcast=False,
        prioridade=get_model_prioridade(mensagem_data.prioridade),
        mensagem_pai_id=mensagem_data.mensagem_pai_id
    )

    db.add(db_mensagem)
    db.commit()
    db.refresh(db_mensagem)
    
    # Reload with relationships
    db_mensagem = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(Mensagem.id == db_mensagem.id).first()

    # Send real-time notification
    try:
        await manager.notify_new_message(
            destinatario_id=mensagem_data.destinatario_id,
            mensagem_id=db_mensagem.id,
            remetente_nome=current_user.nome_completo,
            assunto=mensagem_data.assunto,
            prioridade=mensagem_data.prioridade.value if mensagem_data.prioridade else "normal"
        )
    except Exception as e:
        print(f"[WebSocket] Error notifying user: {e}")

    return mensagem_to_response(db_mensagem)


@router.post("/broadcast-todos")
async def send_broadcast_todos(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Send broadcast message to ALL users"""
    todos_usuarios = db.query(Usuario).filter(
        Usuario.ativo == True,
        Usuario.id != current_user.id
    ).all()

    messages_sent = []

    for usuario in todos_usuarios:
        db_mensagem = Mensagem(
            remetente_id=current_user.id,
            destinatario_id=usuario.id,
            assunto=mensagem_data.assunto,
            corpo=mensagem_data.corpo,
            broadcast=True,
            prioridade=get_model_prioridade(mensagem_data.prioridade)
        )
        db.add(db_mensagem)
        messages_sent.append(usuario.id)

    db.commit()

    # Send notifications (non-blocking)
    for usuario_id in messages_sent:
        try:
            await manager.notify_new_message(
                destinatario_id=usuario_id,
                mensagem_id=0,
                remetente_nome=current_user.nome_completo,
                assunto=mensagem_data.assunto,
                prioridade=mensagem_data.prioridade.value if mensagem_data.prioridade else "normal"
            )
        except Exception as e:
            print(f"[WebSocket] Error notifying user {usuario_id}: {e}")

    return {
        "message": f"Mensagem enviada para {len(messages_sent)} usuários",
        "destinatarios": messages_sent
    }


@router.post("/broadcast-diretores")
async def send_broadcast_diretores(
    mensagem_data: MensagemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Send broadcast message to all directors"""
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
            broadcast=True,
            prioridade=get_model_prioridade(mensagem_data.prioridade)
        )
        db.add(db_mensagem)
        messages_sent.append(diretor.id)

    db.commit()

    # Send notifications (non-blocking)
    for diretor_id in messages_sent:
        try:
            await manager.notify_new_message(
                destinatario_id=diretor_id,
                mensagem_id=0,
                remetente_nome=current_user.nome_completo,
                assunto=mensagem_data.assunto,
                prioridade=mensagem_data.prioridade.value if mensagem_data.prioridade else "normal"
            )
        except Exception as e:
            print(f"[WebSocket] Error notifying director {diretor_id}: {e}")

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
    """Send broadcast message to teachers"""
    query = db.query(Usuario).filter(
        Usuario.perfil == PerfilUsuario.PROFESSOR,
        Usuario.ativo == True
    )

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
            broadcast=True,
            prioridade=get_model_prioridade(mensagem_data.prioridade)
        )
        db.add(db_mensagem)
        messages_sent.append(professor.id)

    db.commit()

    # Send notifications (non-blocking)
    for professor_id in messages_sent:
        try:
            await manager.notify_new_message(
                destinatario_id=professor_id,
                mensagem_id=0,
                remetente_nome=current_user.nome_completo,
                assunto=mensagem_data.assunto,
                prioridade=mensagem_data.prioridade.value if mensagem_data.prioridade else "normal"
            )
        except Exception as e:
            print(f"[WebSocket] Error notifying professor {professor_id}: {e}")

    return {
        "message": f"Mensagem enviada para {len(messages_sent)} professores",
        "destinatarios": messages_sent
    }


@router.get("/inbox", response_model=List[MensagemResponse])
async def get_inbox(
    lida: Optional[bool] = None,
    prioridade: Optional[SchemaPrioridade] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get current user's inbox"""
    query = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(Mensagem.destinatario_id == current_user.id)

    if lida is not None:
        query = query.filter(Mensagem.lida == lida)
    
    if prioridade is not None:
        query = query.filter(Mensagem.prioridade == get_model_prioridade(prioridade))

    mensagens = query.order_by(Mensagem.created_at.desc()).offset(skip).limit(limit).all()
    return [mensagem_to_response(m) for m in mensagens]


@router.get("/sent", response_model=List[MensagemResponse])
async def get_sent(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get current user's sent messages"""
    mensagens = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(
        Mensagem.remetente_id == current_user.id
    ).order_by(Mensagem.created_at.desc()).offset(skip).limit(limit).all()

    return [mensagem_to_response(m) for m in mensagens]


@router.get("/thread/{mensagem_id}", response_model=MensagemComRespostas)
async def get_thread(
    mensagem_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get message thread with all replies"""
    mensagem = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(Mensagem.id == mensagem_id).first()

    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada"
        )

    if mensagem.remetente_id != current_user.id and mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    # Find root message
    root_message = mensagem
    while root_message.mensagem_pai_id:
        root_message = db.query(Mensagem).options(
            joinedload(Mensagem.remetente),
            joinedload(Mensagem.destinatario)
        ).filter(Mensagem.id == root_message.mensagem_pai_id).first()

    # Get all replies
    def get_replies(parent_id: int) -> List[dict]:
        replies = db.query(Mensagem).options(
            joinedload(Mensagem.remetente),
            joinedload(Mensagem.destinatario)
        ).filter(
            Mensagem.mensagem_pai_id == parent_id
        ).order_by(Mensagem.created_at.asc()).all()
        return [mensagem_to_response(r) for r in replies]

    response = mensagem_to_response(root_message)
    response["respostas"] = get_replies(root_message.id)
    
    return response


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

    if mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode marcar esta mensagem como lida"
        )

    remetente_id = mensagem.remetente_id
    mensagem.lida = True
    mensagem.lida_em = datetime.utcnow()
    db.commit()

    try:
        await manager.notify_message_read(remetente_id, mensagem_id)
    except Exception as e:
        print(f"[WebSocket] Error notifying read: {e}")

    return {"message": "Mensagem marcada como lida"}


@router.post("/mark-all-read")
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Mark all messages as read"""
    db.query(Mensagem).filter(
        Mensagem.destinatario_id == current_user.id,
        Mensagem.lida == False
    ).update({
        Mensagem.lida: True,
        Mensagem.lida_em: datetime.utcnow()
    })
    db.commit()

    return {"message": "Todas as mensagens foram marcadas como lidas"}


@router.get("/{mensagem_id}", response_model=MensagemResponse)
async def get_mensagem(
    mensagem_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get specific message"""
    mensagem = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(Mensagem.id == mensagem_id).first()

    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada"
        )

    if mensagem.remetente_id != current_user.id and mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    return mensagem_to_response(mensagem)


@router.delete("/{mensagem_id}")
async def delete_mensagem(
    mensagem_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Delete a message"""
    mensagem = db.query(Mensagem).filter(Mensagem.id == mensagem_id).first()

    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem não encontrada"
        )

    if mensagem.remetente_id != current_user.id and mensagem.destinatario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    db.delete(mensagem)
    db.commit()

    return {"message": "Mensagem excluída com sucesso"}
