# OceanVis — Vercel Full-Stack Deployment

This package is arranged for **one Vercel project** with two Vercel Services:

- `frontend/` — React + Vite frontend
- `backend/` — Java 21 + Spring Boot API running from `Dockerfile.vercel`
- `vercel.json` — shared routing: `/api/*` -> backend, everything else -> frontend

Vercel Services are currently in beta, and Vercel supports OCI container images as Vercel Functions. This is what allows the existing Spring Boot backend to stay in Java instead of being rewritten.

## 1. Put the project on GitHub

Upload the **contents of this folder** to a GitHub repository. Do not upload `node_modules` or `target`.

Example:

```bash
git init
git add .
git commit -m "prepare OceanVis for Vercel full stack"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/oceanvis.git
git push -u origin main
```

## 2. Install the latest Vercel CLI

Use the latest CLI because Vercel Services and container deployments are recent features.

```bash
npm install -g vercel@latest
```

Then from the repository root:

```bash
vercel login
vercel link
vercel deploy --prod
```

When Vercel asks for the project root, keep it at the **repository root**, the folder that contains `vercel.json`, `frontend/`, and `backend/`.

## 3. What Vercel will build

### Frontend service

- Root: `frontend/`
- Framework: Vite
- Build: `npm run build`
- Output: `dist/`

### Backend service

- Root: `backend/`
- Runtime: `container`
- Entrypoint: `Dockerfile.vercel`
- Build: Maven + Java 21
- HTTP port: Vercel's `PORT` environment variable

## 4. Routing

The public URL is a single Vercel domain.

```text
https://YOUR-PROJECT.vercel.app/
       |
       +-- /api/*  ---> Spring Boot backend
       |
       +-- /*      ---> React/Vite frontend
```

The frontend keeps calling `/api/...`, so you do not need to put a Render/Railway backend URL into the frontend.

## 5. Verify deployment

Open these URLs after deployment:

```text
https://YOUR-PROJECT.vercel.app/
https://YOUR-PROJECT.vercel.app/api/health
https://YOUR-PROJECT.vercel.app/api/data-status
https://YOUR-PROJECT.vercel.app/api/demo/overview
```

The second URL should return JSON with `status: UP`.

## 6. If the deployment fails

Check Vercel build logs for one of these stages:

1. `frontend` build error -> check the npm/Vite log.
2. `backend` container build error -> check the Maven log.
3. Backend starts but `/api/health` fails -> check that Spring Boot is listening on `0.0.0.0` and uses the Vercel `PORT`.
4. UI loads but API calls fail -> verify the top-level `rewrites` in `vercel.json` are still present.

## 7. Important data note

This version still uses the project's **DEMO / synthetic dataset**. The deployment infrastructure does not convert it into live INCOIS, ARGO, buoy, or other government data.

## 8. Local development

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Backend:

```bash
mvn clean package -DskipTests
java -jar target/oceanvis-1.0.0.jar
```

For the Vercel-style full-stack local routing, use the latest Vercel CLI from the repository root:

```bash
vercel dev -L
```
