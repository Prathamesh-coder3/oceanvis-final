# OceanVis — Vercel Full-Stack Ready

This repository is prepared for a single Vercel project using Vercel Services.

```text
OceanVis
├── vercel.json
├── frontend/       # React + Vite
└── backend/        # Java 21 + Spring Boot + Dockerfile.vercel
```

Public routing:

- `/api/*` -> Spring Boot backend
- all other paths -> React/Vite frontend

See `DEPLOY_VERCEL.md` for the exact deployment steps.
