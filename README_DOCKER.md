# Run everything with Docker Compose (from this folder)

```powershell
docker compose up --build
```

- Frontend: http://localhost:8085
- Backend API: http://localhost:4000
- Backend health: http://localhost:4000/api/health
- Public settings (WhatsApp + eSewa QR URL): http://localhost:4000/api/public/settings

## Deploy backend on Render
1) Create a new Render Web Service and connect this repo.
2) Use `render.yaml` at the repo root (it sets build/start commands + env vars).
3) After deploy, set the frontend API base to your Render URL (e.g. https://your-service.onrender.com).

## Default admin (created automatically)
- Email: admin@softupakaran.local
- Password: admin12345
