"""
Chart Configuration Router
Only accessible by GESTAO_MUNICIPAL
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import ConfiguracaoGrafico, Usuario, PerfilUsuario
from ..schemas import ConfiguracaoGraficoCreate, ConfiguracaoGraficoUpdate, ConfiguracaoGraficoResponse
from ..auth import get_current_active_user

router = APIRouter()


def require_gestao_municipal(current_user: Usuario = Depends(get_current_active_user)):
    """Verify user is GESTAO_MUNICIPAL"""
    if current_user.perfil != PerfilUsuario.GESTAO_MUNICIPAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a Gestão Municipal pode acessar configurações de gráficos"
        )
    return current_user


@router.get("/", response_model=ConfiguracaoGraficoResponse)
async def get_configuracao(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get current chart configuration
    If no configuration exists, returns default values
    """
    config = db.query(ConfiguracaoGrafico).first()

    if not config:
        # Return default configuration
        config = ConfiguracaoGrafico()
        db.add(config)
        db.commit()
        db.refresh(config)

    # Create response with colors converted to list
    response_data = ConfiguracaoGraficoResponse(
        id=config.id,
        bar_width=config.bar_width,
        chart_height=config.chart_height,
        colors=config.get_colors_list(),
        default_chart_type=config.default_chart_type,
        created_at=config.created_at,
        updated_at=config.updated_at
    )

    return response_data


@router.post("/", response_model=ConfiguracaoGraficoResponse, status_code=status.HTTP_201_CREATED)
async def create_configuracao(
    config_data: ConfiguracaoGraficoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Create initial chart configuration
    Only GESTAO_MUNICIPAL can create
    """
    # Check if configuration already exists
    existing = db.query(ConfiguracaoGrafico).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configuração já existe. Use PUT para atualizar."
        )

    # Create configuration
    db_config = ConfiguracaoGrafico(
        bar_width=config_data.bar_width,
        chart_height=config_data.chart_height,
        default_chart_type=config_data.default_chart_type,
        updated_by_id=current_user.id
    )
    db_config.set_colors_list(config_data.colors)

    db.add(db_config)
    db.commit()
    db.refresh(db_config)

    # Create response with colors converted to list
    response_data = ConfiguracaoGraficoResponse(
        id=db_config.id,
        bar_width=db_config.bar_width,
        chart_height=db_config.chart_height,
        colors=db_config.get_colors_list(),
        default_chart_type=db_config.default_chart_type,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at
    )

    return response_data


@router.put("/", response_model=ConfiguracaoGraficoResponse)
async def update_configuracao(
    config_data: ConfiguracaoGraficoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Update chart configuration
    Only GESTAO_MUNICIPAL can update
    """
    config = db.query(ConfiguracaoGrafico).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração não encontrada. Use POST para criar."
        )

    # Update fields
    if config_data.bar_width is not None:
        config.bar_width = config_data.bar_width
    if config_data.chart_height is not None:
        config.chart_height = config_data.chart_height
    if config_data.colors is not None:
        config.set_colors_list(config_data.colors)
    if config_data.default_chart_type is not None:
        config.default_chart_type = config_data.default_chart_type

    config.updated_by_id = current_user.id

    db.commit()
    db.refresh(config)

    # Create response with colors converted to list
    response_data = ConfiguracaoGraficoResponse(
        id=config.id,
        bar_width=config.bar_width,
        chart_height=config.chart_height,
        colors=config.get_colors_list(),
        default_chart_type=config.default_chart_type,
        created_at=config.created_at,
        updated_at=config.updated_at
    )

    return response_data


@router.post("/reset", response_model=ConfiguracaoGraficoResponse)
async def reset_configuracao(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Reset chart configuration to default values
    Only GESTAO_MUNICIPAL can reset
    """
    config = db.query(ConfiguracaoGrafico).first()

    if not config:
        # Create with defaults
        config = ConfiguracaoGrafico(updated_by_id=current_user.id)
        db.add(config)
    else:
        # Reset to defaults
        config.bar_width = 40
        config.chart_height = 400
        config.colors = "#8884d8,#82ca9d,#ffc658,#ff8042,#0088FE,#00C49F,#FFBB28,#FF8042"
        config.default_chart_type = "bar"
        config.updated_by_id = current_user.id

    db.commit()
    db.refresh(config)

    # Create response with colors converted to list
    response_data = ConfiguracaoGraficoResponse(
        id=config.id,
        bar_width=config.bar_width,
        chart_height=config.chart_height,
        colors=config.get_colors_list(),
        default_chart_type=config.default_chart_type,
        created_at=config.created_at,
        updated_at=config.updated_at
    )

    return response_data
