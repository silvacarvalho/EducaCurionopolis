# Deploy - EDUCA+ Curionópolis

## Modo Desenvolvimento

### Backend
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Desenvolvimento)
```powershell
cd frontend
npm run dev
# Acesse: http://localhost:3000
```

---

## Modo Produção Integrado (Recomendado)

### 1. Build do Frontend
```powershell
cd frontend
npm install
npm run build
```

O build será criado em `frontend/dist/`

### 2. Executar Backend (serve frontend automaticamente)
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Acessar
- **Aplicação completa**: http://localhost:8000
- **API**: http://localhost:8000/api/v1/...
- **Documentação API**: http://localhost:8000/docs

---

## Arquitetura

### Desenvolvimento
- Frontend: Vite dev server (porta 3000) com proxy para API
- Backend: FastAPI (porta 8000)
- CORS configurado entre origens

### Produção
- Frontend: Build estático servido pelo FastAPI
- Backend: FastAPI serve API + frontend build
- Uma única porta (8000)
- SPA routing: todas as rotas não-API retornam `index.html`

---

## Deploy em Servidor

### Requisitos
- Python 3.8+
- Node.js 18+
- PostgreSQL

### Passos
1. Clonar repositório
2. Configurar `.env` no backend
3. Build do frontend: `cd frontend && npm install && npm run build`
4. Backend: `cd backend && pip install -r requirements.txt`
5. Executar: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Nginx (opcional)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Troubleshooting

### Frontend não aparece em produção
- Verificar se `frontend/dist` existe: `ls frontend/dist`
- Rebuild: `cd frontend && npm run build`
- Reiniciar backend

### API retorna 404
- Verificar se rotas começam com `/api/v1/...`
- Checar logs do FastAPI

### WebSocket não conecta
- Verificar token JWT válido
- Confirmar URL: `ws://localhost:8000/ws/{user_id}?token=...`
