"""remove_disciplina_add_configuracao_saeb

Revision ID: 3271322a4933
Revises: 98036d68aa5d
Create Date: 2025-12-03 03:10:24.169337

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3271322a4933'
down_revision: Union[str, None] = '98036d68aa5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create configuracoes_saeb table if not exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS configuracoes_saeb (
            id SERIAL PRIMARY KEY,
            ano_escolar INTEGER NOT NULL UNIQUE,
            questoes_por_bloco INTEGER NOT NULL,
            descricao TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """)

    # Insert default configurations if not exists
    op.execute("""
        INSERT INTO configuracoes_saeb (ano_escolar, questoes_por_bloco, descricao)
        VALUES
            (5, 11, 'Configuração padrão SAEB para 5º ano: 11 questões por bloco'),
            (9, 13, 'Configuração padrão SAEB para 9º ano: 13 questões por bloco')
        ON CONFLICT (ano_escolar) DO NOTHING
    """)

    # Drop disciplina column from simulados_saeb if exists
    op.execute("""
        ALTER TABLE simulados_saeb
        DROP COLUMN IF EXISTS disciplina
    """)


def downgrade() -> None:
    # Re-add disciplina column (with default value for migration)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disciplinasaeb') THEN
                CREATE TYPE disciplinasaeb AS ENUM ('portugues', 'matematica');
            END IF;
        END $$;
    """)

    op.add_column('simulados_saeb', sa.Column('disciplina', sa.Enum('portugues', 'matematica', name='disciplinasaeb'), nullable=False, server_default='portugues'))
    op.alter_column('simulados_saeb', 'disciplina', server_default=None)

    # Drop configuracoes_saeb table
    op.drop_index(op.f('ix_configuracoes_saeb_id'), table_name='configuracoes_saeb')
    op.drop_table('configuracoes_saeb')
