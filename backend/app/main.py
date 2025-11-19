from fastapi import FastAPI
from app.api import api

app = FastAPI(
    title="AI Goal Tracker API",
    description="API for AI-powered goal tracking application",
    version="0.1.0"
)

app.include_router(api.router)

@app.get("/")
async def root():
    return {"message": "AI Goal Tracker API"}