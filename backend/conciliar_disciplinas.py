"""
Script de conciliação de disciplinas duplicadas.

Este script identifica disciplinas com nomes similares (ignorando acentos, 
maiúsculas/minúsculas e espaços extras) e as consolida em uma única disciplina,
preservando todos os vínculos com turmas.

Uso:
    python conciliar_disciplinas.py [--dry-run] [--auto]

Opções:
    --dry-run   Apenas mostra o que seria feito, sem aplicar mudanças
    --auto      Executa automaticamente sem pedir confirmação
"""

import sys
import os
import unicodedata
from typing import Dict, List, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import argparse

# Adiciona o diretório raiz ao path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import get_db
from app.models import Disciplina, turma_disciplina, AvaliacaoBimestral, AvaliacaoAgregada


def normalizar_nome(nome: str) -> str:
    """
    Normaliza o nome da disciplina removendo acentos, 
    convertendo para minúsculas e removendo espaços extras.
    
    Args:
        nome: Nome da disciplina
        
    Returns:
        Nome normalizado
    """
    # Remove acentos (NFD = Normalization Form Decomposed)
    nome_sem_acento = ''.join(
        c for c in unicodedata.normalize('NFD', nome)
        if unicodedata.category(c) != 'Mn'
    )
    
    # Converte para minúsculas e remove espaços extras
    nome_normalizado = ' '.join(nome_sem_acento.lower().split())
    
    return nome_normalizado


def identificar_duplicatas(session) -> Dict[str, List[Disciplina]]:
    """
    Identifica disciplinas com nomes normalizados iguais.
    
    Args:
        session: Sessão do SQLAlchemy
        
    Returns:
        Dicionário onde a chave é o nome normalizado e o valor
        é a lista de disciplinas com esse nome
    """
    disciplinas = session.query(Disciplina).all()
    
    grupos: Dict[str, List[Disciplina]] = {}
    
    for disciplina in disciplinas:
        nome_norm = normalizar_nome(disciplina.nome)
        if nome_norm not in grupos:
            grupos[nome_norm] = []
        grupos[nome_norm].append(disciplina)
    
    # Retorna apenas grupos com mais de uma disciplina (duplicatas)
    duplicatas = {k: v for k, v in grupos.items() if len(v) > 1}
    
    return duplicatas


def escolher_disciplina_principal(disciplinas: List[Disciplina]) -> Disciplina:
    """
    Escolhe qual disciplina será mantida como principal.
    
    Critérios (em ordem de prioridade):
    1. Disciplina com mais vínculos em turmas
    2. Disciplina com carga horária definida
    3. Disciplina com nome mais "limpo" (sem acentos/maiúsculas desnecessárias)
    4. Disciplina com ID menor (mais antiga)
    
    Args:
        disciplinas: Lista de disciplinas duplicadas
        
    Returns:
        Disciplina escolhida como principal
    """
    # Ordena por número de turmas (desc), tem carga horária (desc), ID (asc)
    return sorted(
        disciplinas,
        key=lambda d: (
            -len(d.turmas),  # Mais turmas primeiro
            -(d.carga_horaria or 0),  # Com carga horária primeiro
            d.id  # ID menor (mais antiga)
        )
    )[0]


def consolidar_disciplinas(
    session,
    disciplinas: List[Disciplina],
    principal: Disciplina,
    dry_run: bool = False
) -> Tuple[int, int, int]:
    """
    Consolida vínculos de disciplinas duplicadas em uma única disciplina.
    Atualiza TODAS as referências em outras tabelas antes de remover.
    
    Args:
        session: Sessão do SQLAlchemy
        disciplinas: Lista de disciplinas a consolidar
        principal: Disciplina que será mantida
        dry_run: Se True, apenas simula sem aplicar mudanças
        
    Returns:
        Tupla (vínculos_turma_migrados, avaliacoes_atualizadas, avaliacoes_agregadas_atualizadas)
    """
    duplicadas = [d for d in disciplinas if d.id != principal.id]
    vinculos_migrados = 0
    avaliacoes_atualizadas = 0
    avaliacoes_agregadas_atualizadas = 0
    
    for dup in duplicadas:
        print(f"    • Disciplina '{dup.nome}' (ID: {dup.id}):")
        
        # 1. Contar e atualizar avaliações individuais
        avaliacoes_count = session.query(AvaliacaoBimestral).filter(
            AvaliacaoBimestral.disciplina_id == dup.id
        ).count()
        
        print(f"      - {avaliacoes_count} avaliação(ões) individual(is)")
        
        if avaliacoes_count > 0 and not dry_run:
            session.query(AvaliacaoBimestral).filter(
                AvaliacaoBimestral.disciplina_id == dup.id
            ).update({AvaliacaoBimestral.disciplina_id: principal.id})
            avaliacoes_atualizadas += avaliacoes_count
        
        # 2. Contar e atualizar avaliações agregadas
        avaliacoes_agregadas_count = session.query(AvaliacaoAgregada).filter(
            AvaliacaoAgregada.disciplina_id == dup.id
        ).count()
        
        print(f"      - {avaliacoes_agregadas_count} avaliação(ões) agregada(s)")
        
        if avaliacoes_agregadas_count > 0 and not dry_run:
            session.query(AvaliacaoAgregada).filter(
                AvaliacaoAgregada.disciplina_id == dup.id
            ).update({AvaliacaoAgregada.disciplina_id: principal.id})
            avaliacoes_agregadas_atualizadas += avaliacoes_agregadas_count
        
        # 3. Migrar vínculos turma-disciplina
        turmas_dup = set(dup.turmas)
        turmas_principal = set(principal.turmas)
        
        # Vínculos que precisam ser migrados (turmas que não estão na principal)
        turmas_migrar = turmas_dup - turmas_principal
        
        print(f"      - {len(dup.turmas)} vínculo(s) com turmas")
        print(f"      - {len(turmas_migrar)} vínculo(s) únicos a migrar")
        
        if not dry_run:
            # Adiciona vínculos na disciplina principal
            for turma in turmas_migrar:
                principal.turmas.append(turma)
                vinculos_migrados += 1
            
            # Remove a disciplina duplicada (cascade removerá vínculos restantes)
            session.delete(dup)
    
    if not dry_run:
        session.commit()
    
    return vinculos_migrados, avaliacoes_atualizadas, avaliacoes_agregadas_atualizadas


def main():
    """Função principal do script."""
    parser = argparse.ArgumentParser(
        description='Concilia disciplinas duplicadas no banco de dados'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Apenas mostra o que seria feito, sem aplicar mudanças'
    )
    parser.add_argument(
        '--auto',
        action='store_true',
        help='Executa automaticamente sem pedir confirmação'
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("CONCILIAÇÃO DE DISCIPLINAS DUPLICADAS")
    print("=" * 70)
    
    if args.dry_run:
        print("⚠️  MODO DRY-RUN: Nenhuma alteração será aplicada\n")
    
    # Cria sessão do banco
    from app.database import SessionLocal
    session = SessionLocal()
    
    try:
        # Identifica duplicatas
        print("\n📋 Identificando disciplinas duplicadas...\n")
        duplicatas = identificar_duplicatas(session)
        
        if not duplicatas:
            print("✅ Nenhuma disciplina duplicada encontrada!\n")
            return 0
        
        print(f"⚠️  Encontradas {len(duplicatas)} grupo(s) de disciplinas duplicadas:\n")
        
        total_disciplinas_dup = sum(len(grupo) for grupo in duplicatas.values())
        total_a_manter = len(duplicatas)
        total_a_remover = total_disciplinas_dup - total_a_manter
        
        # Mostra resumo dos grupos
        for nome_norm, grupo in duplicatas.items():
            principal = escolher_disciplina_principal(grupo)
            print(f"📚 Grupo: '{nome_norm}'")
            print(f"   Total de duplicatas: {len(grupo)}")
            print(f"   Principal escolhida: '{principal.nome}' (ID: {principal.id})")
            print(f"   Vínculos: {len(principal.turmas)} turma(s)")
            
            for disc in grupo:
                if disc.id != principal.id:
                    print(f"   • '{disc.nome}' (ID: {disc.id}) - {len(disc.turmas)} turma(s)")
            print()
        
        print(f"📊 Resumo:")
        print(f"   • {total_disciplinas_dup} disciplinas duplicadas encontradas")
        print(f"   • {total_a_manter} disciplina(s) será(ão) mantida(s)")
        print(f"   • {total_a_remover} disciplina(s) será(ão) removida(s)")
        print()
        
        # Confirmação
        if not args.auto and not args.dry_run:
            resposta = input("Deseja prosseguir com a conciliação? (s/N): ")
            if resposta.lower() not in ['s', 'sim', 'y', 'yes']:
                print("\n❌ Operação cancelada pelo usuário.\n")
                return 1
        
        # Executa consolidação
        print("\n🔄 Iniciando consolidação...\n")
        
        total_vinculos_migrados = 0
        total_avaliacoes_atualizadas = 0
        total_avaliacoes_agregadas_atualizadas = 0
        
        for nome_norm, grupo in duplicatas.items():
            principal = escolher_disciplina_principal(grupo)
            print(f"📝 Consolidando grupo '{nome_norm}':")
            print(f"   Disciplina principal: '{principal.nome}' (ID: {principal.id})")
            
            vinculos, avaliacoes, avaliacoes_agr = consolidar_disciplinas(
                session, grupo, principal, args.dry_run
            )
            total_vinculos_migrados += vinculos
            total_avaliacoes_atualizadas += avaliacoes
            total_avaliacoes_agregadas_atualizadas += avaliacoes_agr
            
            if not args.dry_run:
                print(f"   ✅ {len(grupo) - 1} disciplina(s) removida(s)")
                print(f"   ✅ {vinculos} vínculo(s) com turmas migrado(s)")
                print(f"   ✅ {avaliacoes} avaliação(ões) individual(is) atualizada(s)")
                print(f"   ✅ {avaliacoes_agr} avaliação(ões) agregada(s) atualizada(s)")
            else:
                print(f"   ℹ️  Seriam removidas {len(grupo) - 1} disciplina(s)")
                print(f"   ℹ️  Seriam migrados {vinculos} vínculo(s) com turmas")
                print(f"   ℹ️  Seriam atualizadas {avaliacoes} avaliação(ões) individual(is)")
                print(f"   ℹ️  Seriam atualizadas {avaliacoes_agr} avaliação(ões) agregada(s)")
            print()
        
        print("=" * 70)
        if args.dry_run:
            print("ℹ️  DRY-RUN CONCLUÍDO")
            print(f"Seriam migrados {total_vinculos_migrados} vínculo(s) com turmas")
            print(f"Seriam atualizadas {total_avaliacoes_atualizadas} avaliação(ões) individual(is)")
            print(f"Seriam atualizadas {total_avaliacoes_agregadas_atualizadas} avaliação(ões) agregada(s)")
            print(f"Seriam removidas {total_a_remover} disciplina(s)")
        else:
            print("✅ CONCILIAÇÃO CONCLUÍDA COM SUCESSO!")
            print(f"Migrados {total_vinculos_migrados} vínculo(s) com turmas")
            print(f"Atualizadas {total_avaliacoes_atualizadas} avaliação(ões) individual(is)")
            print(f"Atualizadas {total_avaliacoes_agregadas_atualizadas} avaliação(ões) agregada(s)")
            print(f"Removidas {total_a_remover} disciplina(s)")
        print("=" * 70)
        print()
        
        return 0
        
    except Exception as e:
        print(f"\n❌ ERRO: {str(e)}\n")
        session.rollback()
        return 1
        
    finally:
        session.close()


if __name__ == '__main__':
    sys.exit(main())
