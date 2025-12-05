"""add_ano_escolar_to_descritores_saeb

Revision ID: 5a4cd25ab624
Revises: 7823d8307ec0
Create Date: 2025-12-04 16:20:40.258025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a4cd25ab624'
down_revision: Union[str, None] = '7823d8307ec0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar coluna ano_escolar com valor default temporário
    op.add_column('descritores_saeb', sa.Column('ano_escolar', sa.Integer(), nullable=True))

    # Atualizar registros existentes com valor padrão 5
    op.execute("UPDATE descritores_saeb SET ano_escolar = 5 WHERE ano_escolar IS NULL")

    # Tornar a coluna NOT NULL
    op.alter_column('descritores_saeb', 'ano_escolar', nullable=False)


def downgrade() -> None:
    op.drop_column('descritores_saeb', 'ano_escolar')
