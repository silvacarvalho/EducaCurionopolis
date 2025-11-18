"""
Test script for aggregated evaluation endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoints():
    print("=" * 60)
    print("Testing Aggregated Evaluation Report Endpoints")
    print("=" * 60)

    # Try to login first (we'll try common credentials)
    login_attempts = [
        {"email": "admin@curionopolis.pa.gov.br", "senha": "admin123"},
        {"email": "admin@curionopolis.pa.gov.br", "senha": "123456"},
        {"email": "gestao@curionopolis.pa.gov.br", "senha": "admin123"},
    ]

    token = None
    for creds in login_attempts:
        print(f"\n1. Attempting login with {creds['email']}...")
        response = requests.post(f"{BASE_URL}/auth/login-json", json=creds)
        if response.status_code == 200:
            token = response.json()["access_token"]
            print(f"   [OK] Login successful!")
            break
        else:
            print(f"   [FAIL] Login failed: {response.status_code}")

    if not token:
        print("\n[WARNING] Could not login. Testing public endpoints only...")
        headers = {}
    else:
        headers = {"Authorization": f"Bearer {token}"}

    # Test 1: General aggregated report
    print("\n2. Testing /relatorios/avaliacoes-agregadas/geral")
    response = requests.get(
        f"{BASE_URL}/relatorios/avaliacoes-agregadas/geral",
        headers=headers
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Response:")
        print(f"     - Total alunos: {data.get('total_alunos', 0)}")
        print(f"     - Abaixo media: {data.get('abaixo_media', 0)} ({data.get('percentual_abaixo', 0)}%)")
        print(f"     - Na media: {data.get('na_media', 0)} ({data.get('percentual_na', 0)}%)")
        print(f"     - Acima media: {data.get('acima_media', 0)} ({data.get('percentual_acima', 0)}%)")
    else:
        print(f"   [FAIL] Error: {response.text}")

    # Test 2: Drill-down by schools
    print("\n3. Testing /relatorios/avaliacoes-agregadas/drill-down/escolas")
    response = requests.get(
        f"{BASE_URL}/relatorios/avaliacoes-agregadas/drill-down/escolas",
        headers=headers
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Found {len(data)} schools with data")
        for escola in data[:3]:  # Show first 3
            print(f"     - {escola['label']}: {escola['value']} alunos")
    else:
        print(f"   [FAIL] Error: {response.text}")

    # Test 3: Check if there's any data to drill down by turmas
    if token and response.status_code == 200:
        data = response.json()
        if data:
            escola_id = data[0]['escola_id']
            print(f"\n4. Testing /relatorios/avaliacoes-agregadas/drill-down/turmas/{escola_id}")
            response = requests.get(
                f"{BASE_URL}/relatorios/avaliacoes-agregadas/drill-down/turmas/{escola_id}",
                headers=headers
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                turmas = response.json()
                print(f"   [OK] Found {len(turmas)} turmas with data")
                for turma in turmas[:3]:
                    print(f"     - {turma['label']}: {turma['value']} alunos")
            else:
                print(f"   [FAIL] Error: {response.text}")

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_endpoints()
    except Exception as e:
        print(f"\n[ERROR] Error running tests: {e}")
        import traceback
        traceback.print_exc()
