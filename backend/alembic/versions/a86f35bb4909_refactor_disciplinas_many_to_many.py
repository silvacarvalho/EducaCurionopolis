"""refactor_disciplinas_many_to_many

Revision ID: a86f35bb4909
Revises: fix_descritor_unique
Create Date: 2025-12-11 10:56:16.912840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a86f35bb4909'
down_revision: Union[str, None] = 'fix_descritor_unique'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Refatora relacionamento de disciplinas:
    - De 1:N (turma -> disciplinas) para N:M (turma <-> disciplinas)
    - Cria tabela associativa turma_disciplina
    - Migra dados existentes preservando relacionamentos
    - Remove coluna turma_id de disciplinas
    """
    
    # 1. Criar tabela associativa turma_disciplina
    op.create_table(
        'turma_disciplina',
        sa.Column('turma_id', sa.Integer(), nullable=False),
        sa.Column('disciplina_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['disciplina_id'], ['disciplinas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['turma_id'], ['turmas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('turma_id', 'disciplina_id')
    )
    
    # 2. Criar índices para performance
    op.create_index('ix_turma_disciplina_turma_id', 'turma_disciplina', ['turma_id'])
    op.create_index('ix_turma_disciplina_disciplina_id', 'turma_disciplina', ['disciplina_id'])
    
    # 3. Migrar dados existentes: copiar relacionamentos turma_id -> disciplina.id
    op.execute("""
        INSERT INTO turma_disciplina (turma_id, disciplina_id, created_at)
        SELECT turma_id, id, created_at 
        FROM disciplinas 
        WHERE turma_id IS NOT NULL
    """)
    
    # 4. Remover foreign key constraint de disciplinas.turma_id
    op.drop_constraint('disciplinas_turma_id_fkey', 'disciplinas', type_='foreignkey')
    
    # 5. Remover coluna turma_id de disciplinas
    op.drop_column('disciplinas', 'turma_id')
    
    # Log de sucesso
    print("✓ Migration concluída: disciplinas agora são N:M com turmas")


def downgrade() -> None:
    """
    Reverte a refatoração:
    - Adiciona coluna turma_id de volta em disciplinas
    - Restaura dados da tabela associativa
    - Remove tabela turma_disciplina
    
    ATENÇÃO: Rollback pode causar perda de dados se:
    - Uma disciplina estiver vinculada a múltiplas turmas
    - Neste caso, será mantida apenas a primeira vinculação
    """
    
    # 1. Adicionar coluna turma_id de volta
    op.add_column('disciplinas', 
        sa.Column('turma_id', sa.Integer(), nullable=True)
    )
    
    # 2. Restaurar dados da tabela associativa para disciplinas.turma_id
    # ATENÇÃO: Se disciplina tem múltiplas turmas, pega apenas a primeira
    op.execute("""
        UPDATE disciplinas d
        SET turma_id = (
            SELECT turma_id 
            FROM turma_disciplina td 
            WHERE td.disciplina_id = d.id 
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM turma_disciplina td WHERE td.disciplina_id = d.id
        )
    """)
    
    # 3. Recriar foreign key constraint
    op.create_foreign_key(
        'disciplinas_turma_id_fkey', 
        'disciplinas', 
        'turmas', 
        ['turma_id'], 
        ['id']
    )
    
    # 4. Remover índices
    op.drop_index('ix_turma_disciplina_disciplina_id', 'turma_disciplina')
    op.drop_index('ix_turma_disciplina_turma_id', 'turma_disciplina')
    
    # 5. Remover tabela associativa
    op.drop_table('turma_disciplina')
    
    print("✓ Rollback concluído: disciplinas voltaram ao modelo 1:N com turmas")
    print("⚠️  AVISO: Se havia disciplinas vinculadas a múltiplas turmas, apenas uma vinculação foi mantida")
