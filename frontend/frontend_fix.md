# Vercel frontend deployment

Deploy only the `frontend/` app.

Vercel settings:
- Framework: Vite
- Root Directory: `frontend`
- Node Version: 20.x
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Env vars:
- VITE_API_BASE_URL=https://your-backend-url
- VITE_API_SHIM=0
- VITE_SCAN_WORKFLOW=1
- VITE_REPORTS=1
- VITE_DEMO_SIGNUP_FLOW=0

Fallback if repo root must be used:
create a `vercel.json` at the repo root with:

{
  "framework": "vite",
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

repo side fix for vercel.json
{
  "framework": "vite",
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}