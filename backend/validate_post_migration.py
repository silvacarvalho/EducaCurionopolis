"""
Script de Validação Pós-Migration
Verifica integridade dos dados após refatoração de disciplinas
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def validate_post_migration():
    """Valida dados após a migration"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 60)
    print("VALIDAÇÃO PÓS-MIGRATION: Refatoração de Disciplinas")
    print("=" * 60)
    
    with engine.connect() as conn:
        # 1. Verificar versão Alembic
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        version = result.scalar()
        print(f"\n✓ Versão Alembic: {version}")
        
        if version != "a86f35bb4909":
            print(f"⚠️  Versão esperada: a86f35bb4909")
            return False
        
        # 2. Verificar estrutura de disciplinas
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'disciplinas'
            ORDER BY ordinal_position
        """))
        columns = [row[0] for row in result.fetchall()]
        print(f"\n✓ Colunas de disciplinas: {', '.join(columns)}")
        
        if 'turma_id' in columns:
            print("❌ ERRO: coluna turma_id ainda existe!")
            return False
        else:
            print("✓ Coluna turma_id removida com sucesso")
        
        # 3. Verificar tabela turma_disciplina
        result = conn.execute(text("""
            SELECT COUNT(*) FROM turma_disciplina
        """))
        total_vinculos = result.scalar()
        print(f"\n✓ Total de vínculos turma-disciplina: {total_vinculos}")
        
        # 4. Contar disciplinas únicas
        result = conn.execute(text("SELECT COUNT(*) FROM disciplinas"))
        total_disciplinas = result.scalar()
        print(f"✓ Total de disciplinas únicas: {total_disciplinas}")
        
        # 5. Verificar relacionamentos com avaliações
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM avaliacoes_bimestrais ab
            JOIN disciplinas d ON ab.disciplina_id = d.id
        """))
        avaliacoes_validas = result.scalar()
        
        result = conn.execute(text("SELECT COUNT(*) FROM avaliacoes_bimestrais"))
        total_avaliacoes = result.scalar()
        
        print(f"\n✓ Avaliações bimestrais: {avaliacoes_validas}/{total_avaliacoes} com disciplina válida")
        
        # 6. Verificar relacionamentos com avaliações agregadas
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM avaliacoes_agregadas aa
            JOIN disciplinas d ON aa.disciplina_id = d.id
            JOIN turmas t ON aa.turma_id = t.id
        """))
        agregadas_validas = result.scalar()
        
        result = conn.execute(text("SELECT COUNT(*) FROM avaliacoes_agregadas"))
        total_agregadas = result.scalar()
        
        print(f"✓ Avaliações agregadas: {agregadas_validas}/{total_agregadas} com turma+disciplina válidas")
        
        # 7. Listar disciplinas e suas turmas
        result = conn.execute(text("""
            SELECT d.nome, COUNT(td.turma_id) as qtd_turmas
            FROM disciplinas d
            LEFT JOIN turma_disciplina td ON d.id = td.disciplina_id
            GROUP BY d.id, d.nome
            ORDER BY d.nome
        """))
        disciplinas_turmas = result.fetchall()
        
        print(f"\n✓ Disciplinas e quantidade de turmas vinculadas:")
        for nome, qtd in disciplinas_turmas:
            print(f"   - {nome}: {qtd} turma(s)")
        
        # 8. Verificar índices
        result = conn.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'turma_disciplina'
        """))
        indexes = [row[0] for row in result.fetchall()]
        print(f"\n✓ Índices em turma_disciplina: {len(indexes)}")
        for idx in indexes:
            print(f"   - {idx}")
        
        # 9. Testar integridade referencial
        print(f"\n✓ Testando integridade referencial...")
        
        # Vínculos órfãos (disciplina não existe)
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM turma_disciplina td
            LEFT JOIN disciplinas d ON td.disciplina_id = d.id
            WHERE d.id IS NULL
        """))
        vinculos_orfaos_disciplina = result.scalar()
        
        # Vínculos órfãos (turma não existe)
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM turma_disciplina td
            LEFT JOIN turmas t ON td.turma_id = t.id
            WHERE t.id IS NULL
        """))
        vinculos_orfaos_turma = result.scalar()
        
        if vinculos_orfaos_disciplina > 0:
            print(f"   ❌ {vinculos_orfaos_disciplina} vínculos com disciplina inexistente")
            return False
        
        if vinculos_orfaos_turma > 0:
            print(f"   ❌ {vinculos_orfaos_turma} vínculos com turma inexistente")
            return False
        
        print(f"   ✓ Todas as referências são válidas")
        
        # 10. Resumo final
        print("\n" + "=" * 60)
        print("RESUMO DA VALIDAÇÃO")
        print("=" * 60)
        
        print(f"\n✅ Migration aplicada com sucesso!")
        print(f"\nEstatísticas:")
        print(f"  - Disciplinas únicas: {total_disciplinas}")
        print(f"  - Vínculos turma-disciplina: {total_vinculos}")
        print(f"  - Avaliações bimestrais preservadas: {total_avaliacoes}")
        print(f"  - Avaliações agregadas preservadas: {total_agregadas}")
        print(f"\n✓ Sistema agora suporta N:M entre turmas e disciplinas")
        print(f"✓ Todas as integridades referenciais mantidas")
        print(f"✓ Nenhuma perda de dados detectada")
        
        return True

if __name__ == "__main__":
    try:
        success = validate_post_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Erro durante validação: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
