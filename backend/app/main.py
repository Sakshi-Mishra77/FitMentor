# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, sessions, interviews

app = FastAPI(title="AI Interview Platform API (MongoDB)")

# Setup CORS to allow Next.js frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the auth router
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Interview Sessions"])  # New route registered
app.include_router(interviews.router, prefix="/api/interviews", tags=["Live Interviews"])
@app.get("/")
def root():
    return {"message": "MongoDB Backend is running!"}
