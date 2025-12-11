"""
Script de Validação Pré-Migration
Verifica integridade dos dados antes de executar a refatoração de disciplinas
"""
import sys
import os

# Adicionar diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def validate_pre_migration():
    """Valida dados antes da migration"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 60)
    print("VALIDAÇÃO PRÉ-MIGRATION: Refatoração de Disciplinas")
    print("=" * 60)
    
    with engine.connect() as conn:
        # 1. Contar disciplinas totais
        result = conn.execute(text("SELECT COUNT(*) FROM disciplinas"))
        total_disciplinas = result.scalar()
        print(f"\n✓ Total de disciplinas: {total_disciplinas}")
        
        # 2. Contar disciplinas com turma_id NULL
        result = conn.execute(text("SELECT COUNT(*) FROM disciplinas WHERE turma_id IS NULL"))
        disciplinas_sem_turma = result.scalar()
        print(f"✓ Disciplinas sem turma: {disciplinas_sem_turma}")
        
        # 3. Contar disciplinas com turma_id válido
        disciplinas_com_turma = total_disciplinas - disciplinas_sem_turma
        print(f"✓ Disciplinas com turma: {disciplinas_com_turma}")
        
        # 4. Verificar disciplinas órfãs (turma_id aponta para turma inexistente)
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM disciplinas d
            LEFT JOIN turmas t ON d.turma_id = t.id
            WHERE d.turma_id IS NOT NULL AND t.id IS NULL
        """))
        disciplinas_orfas = result.scalar()
        
        if disciplinas_orfas > 0:
            print(f"\n⚠️  ATENÇÃO: {disciplinas_orfas} disciplinas órfãs encontradas!")
            print("   (turma_id aponta para turma inexistente)")
            
            # Listar disciplinas órfãs
            result = conn.execute(text("""
                SELECT d.id, d.nome, d.turma_id
                FROM disciplinas d
                LEFT JOIN turmas t ON d.turma_id = t.id
                WHERE d.turma_id IS NOT NULL AND t.id IS NULL
            """))
            orfas = result.fetchall()
            for disciplina in orfas:
                print(f"   - ID: {disciplina[0]}, Nome: {disciplina[1]}, turma_id: {disciplina[2]}")
        else:
            print(f"✓ Sem disciplinas órfãs")
        
        # 5. Contar avaliações bimestrais
        result = conn.execute(text("SELECT COUNT(*) FROM avaliacoes_bimestrais"))
        total_avaliacoes = result.scalar()
        print(f"\n✓ Total de avaliações bimestrais: {total_avaliacoes}")
        
        # 6. Verificar avaliações com disciplina inválida
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM avaliacoes_bimestrais ab
            LEFT JOIN disciplinas d ON ab.disciplina_id = d.id
            WHERE d.id IS NULL
        """))
        avaliacoes_invalidas = result.scalar()
        
        if avaliacoes_invalidas > 0:
            print(f"⚠️  ATENÇÃO: {avaliacoes_invalidas} avaliações com disciplina_id inválido!")
        else:
            print(f"✓ Todas avaliações têm disciplina válida")
        
        # 7. Contar avaliações agregadas
        result = conn.execute(text("SELECT COUNT(*) FROM avaliacoes_agregadas"))
        total_agregadas = result.scalar()
        print(f"✓ Total de avaliações agregadas: {total_agregadas}")
        
        # 8. Distribuição de disciplinas por turma
        result = conn.execute(text("""
            SELECT t.nome, COUNT(d.id) as qtd_disciplinas
            FROM turmas t
            LEFT JOIN disciplinas d ON d.turma_id = t.id
            GROUP BY t.id, t.nome
            ORDER BY qtd_disciplinas DESC
            LIMIT 10
        """))
        turmas_disciplinas = result.fetchall()
        
        print(f"\n✓ Top 10 turmas com mais disciplinas:")
        for turma, qtd in turmas_disciplinas:
            print(f"   - {turma}: {qtd} disciplinas")
        
        # 9. Disciplinas duplicadas (mesmo nome em turmas diferentes)
        result = conn.execute(text("""
            SELECT nome_lower, COUNT(DISTINCT id) as qtd_registros, COUNT(DISTINCT turma_id) as qtd_turmas
            FROM (
                SELECT d.id, LOWER(TRIM(d.nome)) as nome_lower, d.turma_id
                FROM disciplinas d
                WHERE d.turma_id IS NOT NULL
            ) subq
            GROUP BY nome_lower
            HAVING COUNT(DISTINCT id) > 1
            ORDER BY qtd_registros DESC
        """))
        duplicadas = result.fetchall()
        
        if duplicadas:
            print(f"\n✓ Disciplinas duplicadas (serão consolidadas após migration):")
            for nome, qtd_registros, qtd_turmas in duplicadas[:10]:
                print(f"   - '{nome}': {qtd_registros} registros em {qtd_turmas} turmas")
        else:
            print(f"\n✓ Sem disciplinas duplicadas detectadas")
        
        # 10. Resumo final
        print("\n" + "=" * 60)
        print("RESUMO DA VALIDAÇÃO")
        print("=" * 60)
        
        issues = []
        if disciplinas_orfas > 0:
            issues.append(f"⚠️  {disciplinas_orfas} disciplinas órfãs")
        if avaliacoes_invalidas > 0:
            issues.append(f"⚠️  {avaliacoes_invalidas} avaliações inválidas")
        
        if issues:
            print("\n⚠️  PROBLEMAS ENCONTRADOS:")
            for issue in issues:
                print(f"   {issue}")
            print("\n   Recomendação: Corrija os problemas antes de executar a migration")
            return False
        else:
            print("\n✅ Validação OK! Pronto para executar a migration")
            print(f"\nApós a migration, {disciplinas_com_turma} relacionamentos serão criados")
            print("na nova tabela turma_disciplina")
            return True

if __name__ == "__main__":
    try:
        success = validate_pre_migration()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Erro durante validação: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
