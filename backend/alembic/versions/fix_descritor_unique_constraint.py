"""fix descritor unique constraint - codigo should be unique per disciplina and ano_escolar

Revision ID: fix_descritor_unique
Revises: 7823d8307ec0
Create Date: 2024-12-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_descritor_unique'
down_revision: Union[str, None] = '5e2fedce25f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove a constraint antiga de unicidade apenas no codigo
    op.drop_constraint('descritores_saeb_codigo_key', 'descritores_saeb', type_='unique')
    
    # Cria nova constraint composta: codigo + disciplina + ano_escolar
    op.create_unique_constraint(
        'uq_descritor_codigo_disciplina_ano',
        'descritores_saeb',
        ['codigo', 'disciplina', 'ano_escolar']
    )


def downgrade() -> None:
    # Remove a constraint composta
    op.drop_constraint('uq_descritor_codigo_disciplina_ano', 'descritores_saeb', type_='unique')
    
    # Restaura a constraint original (apenas codigo)
    op.create_unique_constraint('descritores_saeb_codigo_key', 'descritores_saeb', ['codigo'])
