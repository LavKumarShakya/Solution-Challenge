from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.routers import learning_path, auth, saved_courses
from app.database import init_db

app = FastAPI(
    title="AetherLearn API",
    description="API for AetherLearn AI-Powered Learning Platform",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth.router, tags=["Authentication"], prefix="/api/auth")
app.include_router(learning_path.router, tags=["Learning Path"], prefix="/api/learning-path")
app.include_router(saved_courses.router, tags=["Saved Courses"])

@app.on_event("startup")
async def startup_db_client():
    await init_db()

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to AetherLearn API!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
