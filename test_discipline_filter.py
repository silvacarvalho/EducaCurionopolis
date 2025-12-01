"""
Test discipline filter for aggregated evaluations
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_discipline_filter():
    print("=" * 60)
    print("Testing Discipline Filter in Aggregated Reports")
    print("=" * 60)

    # Login attempts with more credentials
    login_attempts = [
        {"email": "diretor@diretor.com", "senha": "admin123"},
        {"email": "admin@curionopolis.pa.gov.br", "senha": "admin123"},
        {"email": "teste@teste.com.br", "senha": "admin123"},
    ]

    token = None
    for creds in login_attempts:
        print(f"\nAttempting login with {creds['email']}...")
        response = requests.post(f"{BASE_URL}/auth/login-json", json=creds)
        if response.status_code == 200:
            token = response.json()["access_token"]
            print(f"   [OK] Login successful!")
            break
        else:
            print(f"   [FAIL] Login failed: {response.status_code}")

    if not token:
        print("\n[ERROR] Could not login. Cannot test endpoints.")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # Get list of disciplines
    print("\n1. Getting list of disciplines...")
    response = requests.get(f"{BASE_URL}/disciplinas/", headers=headers)
    print(f"   Status: {response.status_code}")

    disciplinas = []
    if response.status_code == 200:
        disciplinas = response.json()
        print(f"   [OK] Found {len(disciplinas)} disciplines")
        for disc in disciplinas[:3]:
            print(f"     - {disc['nome']} (ID: {disc['id']})")
    else:
        print(f"   [FAIL] Error: {response.text}")
        return

    # Test without filter
    print("\n2. Testing general report WITHOUT discipline filter")
    response = requests.get(
        f"{BASE_URL}/relatorios/avaliacoes-agregadas/geral",
        headers=headers,
        params={"ano_letivo": 2025, "bimestre": 1}
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Total alunos (all disciplines): {data.get('total_alunos', 0)}")
        print(f"     - Abaixo: {data.get('abaixo_media', 0)}")
        print(f"     - Na média: {data.get('na_media', 0)}")
        print(f"     - Acima: {data.get('acima_media', 0)}")
    else:
        print(f"   [FAIL] Error: {response.text}")

    # Test WITH discipline filter (if we have disciplines)
    if disciplinas:
        disciplina_id = disciplinas[0]['id']
        print(f"\n3. Testing general report WITH discipline filter (ID: {disciplina_id})")
        response = requests.get(
            f"{BASE_URL}/relatorios/avaliacoes-agregadas/geral",
            headers=headers,
            params={"ano_letivo": 2025, "bimestre": 1, "disciplina_id": disciplina_id}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Total alunos (discipline {disciplina_id}): {data.get('total_alunos', 0)}")
            print(f"     - Abaixo: {data.get('abaixo_media', 0)}")
            print(f"     - Na média: {data.get('na_media', 0)}")
            print(f"     - Acima: {data.get('acima_media', 0)}")
        else:
            print(f"   [FAIL] Error: {response.text}")

        # Test drill-down by schools WITH discipline filter
        print(f"\n4. Testing drill-down by schools WITH discipline filter (ID: {disciplina_id})")
        response = requests.get(
            f"{BASE_URL}/relatorios/avaliacoes-agregadas/drill-down/escolas",
            headers=headers,
            params={"ano_letivo": 2025, "bimestre": 1, "disciplina_id": disciplina_id}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Found {len(data)} schools")
            for escola in data[:3]:
                print(f"     - {escola['label']}: {escola['value']} alunos")
        else:
            print(f"   [FAIL] Error: {response.text}")

        # Test drill-down by turmas WITH discipline filter
        if response.status_code == 200 and data:
            escola_id = data[0]['escola_id']
            print(f"\n5. Testing drill-down by turmas WITH discipline filter (Escola ID: {escola_id}, Disc: {disciplina_id})")
            response = requests.get(
                f"{BASE_URL}/relatorios/avaliacoes-agregadas/drill-down/turmas/{escola_id}",
                headers=headers,
                params={"ano_letivo": 2025, "bimestre": 1, "disciplina_id": disciplina_id}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                turmas = response.json()
                print(f"   [OK] Found {len(turmas)} turmas")
                for turma in turmas:
                    print(f"     - {turma['label']}: {turma['value']} alunos")
            else:
                print(f"   [FAIL] Error: {response.text}")

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_discipline_filter()
    except Exception as e:
        print(f"\n[ERROR] Error running tests: {e}")
        import traceback
        traceback.print_exc()
