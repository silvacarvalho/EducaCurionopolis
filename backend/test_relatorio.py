"""
Script para testar o relatório de diagnóstico
"""
from app.database import SessionLocal
from app.models import Diagnostico, DiagnosticoResultado, Aluno, Turma, HipoteseEscrita
from collections import Counter

def main():
    db = SessionLocal()

    try:
        diagnostico_id = 1

        # Buscar diagnóstico
        diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()
        print(f"Diagnóstico: {diagnostico.nome}")
        print(f"Aplicável para anos: {diagnostico.aplicavel_ano_inicial} a {diagnostico.aplicavel_ano_final}")
        print()

        # Query base para alunos aplicáveis
        alunos_query = db.query(Aluno).join(Turma).filter(
            Turma.ano_escolar >= diagnostico.aplicavel_ano_inicial,
            Turma.ano_escolar <= diagnostico.aplicavel_ano_final,
            Aluno.ativo == True
        )
        total_alunos_turma = alunos_query.count()
        print(f"Total de alunos nas turmas aplicáveis: {total_alunos_turma}")
        print()

        # Buscar resultados
        resultados = db.query(DiagnosticoResultado).filter(
            DiagnosticoResultado.diagnostico_id == diagnostico_id
        ).all()

        print(f"Total de resultados registrados: {len(resultados)}")
        print()

        # Separar por hipótese
        print("Detalhamento dos resultados:")
        for r in resultados:
            aluno = db.query(Aluno).filter(Aluno.id == r.aluno_id).first()
            print(f"  - {aluno.nome_completo}: {r.hipotese_escrita.value}")
        print()

        # Contar
        resultados_avaliados = [r for r in resultados if r.hipotese_escrita != HipoteseEscrita.NAO_AVALIADO]
        resultados_nao_avaliados = [r for r in resultados if r.hipotese_escrita == HipoteseEscrita.NAO_AVALIADO]

        total_alunos_avaliados = len(resultados_avaliados)
        total_com_registro_nao_avaliado = len(resultados_nao_avaliados)
        total_sem_registro = total_alunos_turma - len(resultados)
        total_nao_avaliados = total_sem_registro + total_com_registro_nao_avaliado

        print("=" * 60)
        print("RESUMO:")
        print("=" * 60)
        print(f"Total de alunos na turma: {total_alunos_turma}")
        print(f"Alunos avaliados (hipotese != NAO_AVALIADO): {total_alunos_avaliados}")
        print(f"Alunos com registro NAO_AVALIADO: {total_com_registro_nao_avaliado}")
        print(f"Alunos sem registro: {total_sem_registro}")
        print(f"Total não avaliados (com registro NAO_AVALIADO + sem registro): {total_nao_avaliados}")
        print()

        # Percentuais
        percentual_avaliados = (total_alunos_avaliados / total_alunos_turma * 100) if total_alunos_turma > 0 else 0.0
        percentual_nao_avaliados = (total_nao_avaliados / total_alunos_turma * 100) if total_alunos_turma > 0 else 0.0

        print(f"Percentual avaliados: {percentual_avaliados:.2f}%")
        print(f"Percentual não avaliados: {percentual_nao_avaliados:.2f}%")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    main()
