"""add_disciplina_to_descritores_saeb

Revision ID: 5e2fedce25f5
Revises: 5a4cd25ab624
Create Date: 2025-12-04 17:29:35.136561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e2fedce25f5'
down_revision: Union[str, None] = '5a4cd25ab624'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Verificar se o tipo ENUM já existe, se não, criar
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disciplinasaeb') THEN
                CREATE TYPE disciplinasaeb AS ENUM ('PORTUGUES', 'MATEMATICA');
            END IF;
        END $$;
    """)

    # Adicionar coluna disciplina com valor default temporário
    op.add_column('descritores_saeb', sa.Column('disciplina', sa.Enum('PORTUGUES', 'MATEMATICA', name='disciplinasaeb'), nullable=True))

    # Atualizar registros existentes com valor padrão PORTUGUES
    op.execute("UPDATE descritores_saeb SET disciplina = 'PORTUGUES' WHERE disciplina IS NULL")

    # Tornar a coluna NOT NULL
    op.alter_column('descritores_saeb', 'disciplina', nullable=False)


def downgrade() -> None:
    op.drop_column('descritores_saeb', 'disciplina')
    op.execute("DROP TYPE disciplinasaeb")
