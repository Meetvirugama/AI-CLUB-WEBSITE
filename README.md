# AI Club DAU Platform

A modern full-stack platform built for the college AI Club featuring event management, dynamic form builder, member/project showcase, Google OAuth authentication, and an integrated Gemini AI assistant.

### 🌟 Live Demo
- **Frontend (Vercel)**: [https://ai-club-website-lyart.vercel.app](https://ai-club-website-lyart.vercel.app)
- **Backend API (Render)**: [https://ai-club-website-e9zk.onrender.com/docs](https://ai-club-website-e9zk.onrender.com/docs)

---

## 📁 Repository Structure

```
ai-club/
├── frontend/                     # React + Vite + TailwindCSS + TypeScript UI
│   ├── src/                      # Source code (Components, Pages, Hooks, Libs)
│   ├── public/                   # Static public assets
│   ├── vercel.json               # Vercel deployment & API rewrite config
│   └── package.json              # Frontend scripts and dependencies
├── backend/                      # FastAPI + SQLAlchemy (AsyncIO) + PostgreSQL API
│   ├── main.py                   # FastAPI entrypoint & routes initialization
│   ├── db.py                     # Async database connection engine
│   ├── requirements.txt          # Python dependencies
│   ├── vercel.json               # Backend Vercel serverless deployment config
│   └── uploads/                  # Uploaded assets & certificates
├── notebooks/                    # Data analysis & ML research notebooks
├── .gitignore                    # Monorepo gitignore rules
└── README.md                     # Documentation
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Framer Motion, Radix UI, Lucide Icons, React Router DOM.
- **Backend**: FastAPI, Python 3.10+, SQLAlchemy (AsyncIO), AsyncPG, Pydantic v2, PyJWT, Google Auth.
- **AI Integrations**: Google Gemini AI (`google-genai` SDK).
- **Database**: PostgreSQL (Supabase / Neon / Render / Railway).

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend

# Create & activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Fill in DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET_KEY, etc.

# Start development server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Configure environment variables (optional for dev)
# VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🌐 Production Deployment Guide

### Deploying Frontend (Vercel)
1. Import the `frontend/` directory into Vercel.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable: `VITE_API_URL` pointing to your deployed backend URL.

### Deploying Backend (Render / Railway / Cloud Run)
1. Deploy `backend/` as a Web Service.
2. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set Required Environment Variables:
   - `DATABASE_URL` (e.g., `postgresql+asyncpg://user:pass@host:5432/dbname`)
   - `GOOGLE_CLIENT_ID`
   - `JWT_SECRET_KEY`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS` (Comma-separated origins of your deployed frontend)
   - `ENVIRONMENT=production`
