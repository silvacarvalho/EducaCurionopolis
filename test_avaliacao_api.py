import sys
sys.path.insert(0, 'backend')

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Test if endpoint exists
response = client.get("/api/v1/avaliacoes-agregadas")
print(f"GET /api/v1/avaliacoes-agregadas - Status: {response.status_code}")

if response.status_code != 401:  # Not authenticated is expected
    print(f"Response: {response.json()}")
else:
    print("Authentication required (expected)")

# Check if route is registered
print("\nRegistered routes:")
for route in app.routes:
    if 'avaliacoes-agregadas' in str(route.path):
        print(f"  {route.methods} {route.path}")
