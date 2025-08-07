"""
FastAPI application entry point for RAG Botsy
"""
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, bot_router, chat_router, widget_router

app = FastAPI(
    title="RAG Botsy API",
    description="A RAG-based chatbot platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(bot_router.router, prefix="/api/bots", tags=["bots"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["chat"])
app.include_router(widget_router.router, prefix="/api/widgets", tags=["widgets"])

@app.get("/")
async def root():
    return {"message": "RAG Botsy API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/favicon.ico")
async def favicon():
    return {"message": "No favicon configured"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
